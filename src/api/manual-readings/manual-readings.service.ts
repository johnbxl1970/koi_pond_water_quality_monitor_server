import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_PUB } from '../../redis/redis.module';
import { AlertsService } from '../../alerts/alerts.service';
import { computeFreeNh3 } from '../../recommendations/free-nh3';
import { STREAM_CHANNEL } from '../../ingest/ingest.service';
import {
  CreateManualReadingDto,
  MANUAL_READING_PARAM_FIELDS,
} from './manual-readings.dto';

/**
 * Synthetic deviceId used when a ManualReading is fanned into the Telemetry
 * hypertable. Keeping it stable per pond (rather than per user) lets queries
 * group manual entries cleanly without polluting the Device table.
 */
const manualDeviceId = (pondId: string) => `manual:${pondId}`;

@Injectable()
export class ManualReadingsService {
  private readonly logger = new Logger(ManualReadingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    @Inject(REDIS_PUB) private readonly pub: Redis,
  ) {}

  async create(pondId: string, userId: string, dto: CreateManualReadingDto) {
    const hasAnyParam = MANUAL_READING_PARAM_FIELDS.some(
      (k) => dto[k] != null,
    );
    if (!hasAnyParam) {
      throw new BadRequestException(
        'At least one water parameter must be provided',
      );
    }

    const time = dto.time ? new Date(dto.time) : new Date();
    const nh3FreePpm =
      dto.nh3TotalPpm != null && dto.phVal != null && dto.tempC != null
        ? computeFreeNh3(dto.nh3TotalPpm, dto.phVal, dto.tempC)
        : null;

    const fields = {
      phVal: dto.phVal ?? null,
      tempC: dto.tempC ?? null,
      doMgL: dto.doMgL ?? null,
      orpMv: dto.orpMv ?? null,
      tdsPpm: dto.tdsPpm ?? null,
      turbidityNtu: dto.turbidityNtu ?? null,
      nh3TotalPpm: dto.nh3TotalPpm ?? null,
      nh3FreePpm,
      no2Ppm: dto.no2Ppm ?? null,
      no3Ppm: dto.no3Ppm ?? null,
      khDkh: dto.khDkh ?? null,
      ghDgh: dto.ghDgh ?? null,
    };

    // Dual write: ManualReading is the canonical record (with author + notes),
    // Telemetry is the fan-in so existing alert/recommendation/stream paths
    // see the values without bespoke wiring. Both must succeed together.
    const reading = await this.prisma.$transaction(async (tx) => {
      const manual = await tx.manualReading.create({
        data: {
          pondId,
          recordedById: userId,
          time,
          notes: dto.notes ?? null,
          ...fields,
        },
      });

      await tx.telemetry.create({
        data: {
          time,
          deviceId: manualDeviceId(pondId),
          pondId,
          source: 'manual',
          ...fields,
          raw: {
            source: 'manual',
            manualReadingId: manual.id,
            recordedById: userId,
          } as object,
        },
      });

      return manual;
    });

    // Post-commit fan-out. Failures here must not unwind the persisted reading.
    const streamPayload = {
      time,
      deviceId: manualDeviceId(pondId),
      pondId,
      source: 'manual',
      manualReadingId: reading.id,
      ...fields,
    };
    try {
      await this.pub.publish(STREAM_CHANNEL(pondId), JSON.stringify(streamPayload));
    } catch (err) {
      this.logger.warn(
        `Stream publish failed for manual reading ${reading.id}: ${(err as Error).message}`,
      );
    }
    try {
      await this.alerts.evaluate(pondId, { pondId, ...fields });
    } catch (err) {
      this.logger.warn(
        `Alert evaluation failed for manual reading ${reading.id}: ${(err as Error).message}`,
      );
    }

    return reading;
  }

  list(pondId: string, limit: number) {
    return this.prisma.manualReading.findMany({
      where: { pondId },
      orderBy: { time: 'desc' },
      take: limit,
    });
  }
}
