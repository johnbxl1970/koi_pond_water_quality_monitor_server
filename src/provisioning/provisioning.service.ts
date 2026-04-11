import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PondRole } from '@prisma/client';
import * as argon2 from 'argon2';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/config.service';
import { REDIS_PUB } from '../redis/redis.module';
import { CaService, SignedQrPayload } from './ca.service';
import { PreRegisterClaimDto } from './provisioning.dto';

const pendingCsrKey = (hardwareId: string) => `pending_csr:${hardwareId}`;

export interface CsrSubmission {
  hardwareId: string;
  csrPem: string;
  attestationCertPem: string;
  nonce: string;
}

@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly ca: CaService,
    @Inject(REDIS_PUB) private readonly redis: Redis,
  ) {}

  // --- admin / flashing-tool side ----------------------------------------

  async preRegister(dto: PreRegisterClaimDto): Promise<SignedQrPayload> {
    if (!this.ca.verifyAttestation(dto.attestationCertPem, dto.hardwareId)) {
      throw new BadRequestException('Invalid attestation certificate');
    }
    const existing = await this.prisma.deviceClaim.findUnique({
      where: { hardwareId: dto.hardwareId },
    });
    if (existing && existing.status === 'PENDING') {
      throw new ConflictException(`Claim already pending for ${dto.hardwareId}`);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.config.claimTokenTtlDays);
    const claimTokenHash = await argon2.hash(dto.claimToken, { type: argon2.argon2id });

    await this.prisma.deviceClaim.upsert({
      where: { hardwareId: dto.hardwareId },
      create: {
        hardwareId: dto.hardwareId,
        claimTokenHash,
        pubkeyFingerprint: dto.pubkeyFingerprint,
        attestationCertPem: dto.attestationCertPem,
        expiresAt,
      },
      update: {
        claimTokenHash,
        pubkeyFingerprint: dto.pubkeyFingerprint,
        attestationCertPem: dto.attestationCertPem,
        status: 'PENDING',
        expiresAt,
        consumedAt: null,
        consumedByPondId: null,
      },
    });

    return this.ca.signQrPayload({
      v: 1,
      hw: dto.hardwareId,
      tok: dto.claimToken,
      fp: dto.pubkeyFingerprint,
    });
  }

  qrSigningPublicKeyPem(): string {
    return this.ca.qrSigningPublicKeyPem();
  }

  // --- device side: CSR arrives over MQTT --------------------------------

  async handleCsr(submission: CsrSubmission): Promise<void> {
    const claim = await this.prisma.deviceClaim.findUnique({
      where: { hardwareId: submission.hardwareId },
    });
    if (!claim) {
      this.logger.warn(`CSR for unknown hardwareId=${submission.hardwareId}`);
      return;
    }
    if (claim.status !== 'PENDING') {
      this.logger.warn(`CSR for non-pending claim ${submission.hardwareId} (${claim.status})`);
      return;
    }
    if (claim.expiresAt < new Date()) {
      await this.prisma.deviceClaim.update({
        where: { id: claim.id },
        data: { status: 'EXPIRED' },
      });
      return;
    }

    // Buffer the CSR until the user POSTs /claim. If the user already POSTed,
    // this path issues the cert inline via tryIssueIfClaimed.
    await this.redis.set(
      pendingCsrKey(submission.hardwareId),
      JSON.stringify(submission),
      'EX',
      this.config.pendingCsrTtlSeconds,
    );
    this.logger.log(`Buffered CSR for ${submission.hardwareId}`);

    // If a user has already invoked /claim for this device and we were just
    // waiting on the CSR, issue immediately.
    // (Signaled by consumedByPondId being set before the cert publishes.)
    if (claim.consumedByPondId && !claim.consumedAt) {
      await this.issueAndPublish(submission, claim.consumedByPondId);
    }
  }

  // --- user side: mobile app POSTs /claim --------------------------------

  async claim(
    claimToken: string,
    pondId: string,
    userId: string,
  ): Promise<{ status: 'issued' | 'waiting' }> {
    const pond = await this.prisma.pond.findUnique({ where: { id: pondId } });
    if (!pond) throw new NotFoundException(`Pond ${pondId} not found`);

    const membership = await this.prisma.pondMember.findUnique({
      where: { pondId_userId: { pondId, userId } },
    });
    if (!membership) throw new NotFoundException(`Pond ${pondId} not found`);
    if (membership.role !== PondRole.OWNER) {
      throw new ForbiddenException('Only the pond owner can claim devices');
    }

    // We don't know the hardwareId from the token alone; find by hash scan.
    // For MVP we fetch pending claims and verify; this is O(pending claims)
    // which is trivial at hobbyist scale. A production impl would store a
    // short index derived from the token (e.g., HMAC prefix) to make this O(1).
    const candidates = await this.prisma.deviceClaim.findMany({
      where: { status: 'PENDING', expiresAt: { gt: new Date() } },
    });
    let claim: (typeof candidates)[number] | null = null;
    for (const c of candidates) {
      if (await argon2.verify(c.claimTokenHash, claimToken)) {
        claim = c;
        break;
      }
    }
    if (!claim) throw new NotFoundException('Claim token not found or expired');

    // Mark the pond so the CSR handler can issue as soon as the device shows up.
    await this.prisma.deviceClaim.update({
      where: { id: claim.id },
      data: { consumedByPondId: pondId },
    });

    // Is the CSR already sitting in Redis?
    const buffered = await this.redis.get(pendingCsrKey(claim.hardwareId));
    if (buffered) {
      const submission = JSON.parse(buffered) as CsrSubmission;
      await this.issueAndPublish(submission, pondId);
      return { status: 'issued' };
    }
    return { status: 'waiting' };
  }

  // --- cert issuance + publish -------------------------------------------

  private async issueAndPublish(submission: CsrSubmission, pondId: string) {
    const claim = await this.prisma.deviceClaim.findUnique({
      where: { hardwareId: submission.hardwareId },
    });
    if (!claim || claim.status !== 'PENDING') return;

    const csr = this.ca.verifyCsr(submission.csrPem, claim.pubkeyFingerprint);
    if (!csr) {
      this.logger.warn(`Rejected CSR for ${submission.hardwareId}`);
      return;
    }

    const issued = this.ca.issueOperationalCert(csr, submission.hardwareId);

    await this.prisma.$transaction(async (tx) => {
      const device = await tx.device.upsert({
        where: { hardwareId: submission.hardwareId },
        create: {
          hardwareId: submission.hardwareId,
          pondId,
          label: null,
        },
        update: { pondId },
      });

      await tx.deviceCertificate.create({
        data: {
          deviceId: device.id,
          serial: issued.serial,
          certPem: issued.certPem,
          issuedAt: issued.issuedAt,
          expiresAt: issued.expiresAt,
        },
      });

      await tx.deviceClaim.update({
        where: { id: claim.id },
        data: {
          status: 'CONSUMED',
          consumedAt: new Date(),
          consumedByPondId: pondId,
        },
      });
    });

    await this.redis.del(pendingCsrKey(submission.hardwareId));

    // Publish the issued cert back to the device over MQTT via the ingest
    // client. We re-use the existing connection rather than a separate one.
    const topic = `provisioning/${submission.hardwareId}/response`;
    const payload = JSON.stringify({
      cert: issued.certPem,
      chain: issued.chainPem,
      expiresAt: issued.expiresAt.toISOString(),
      serial: issued.serial,
    });
    // Published via the bridge in IngestService — see handleCsr wiring.
    this.onIssued?.(topic, payload);
    this.logger.log(`Issued cert ${issued.serial} for ${submission.hardwareId}`);
  }

  /** Wired by IngestService at init time so provisioning responses go out
   *  on the same MQTT client that handles telemetry ingest. */
  onIssued?: (topic: string, payload: string) => void;
}
