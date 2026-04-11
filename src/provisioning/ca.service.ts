import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as forge from 'node-forge';
import { createPrivateKey, createPublicKey, randomBytes, sign, verify, KeyObject } from 'node:crypto';
import { AppConfig } from '../config/config.service';

export interface IssuedCert {
  certPem: string;
  chainPem: string;
  serial: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface SignedQrPayload {
  v: number;
  hw: string;
  tok: string;
  fp: string;
  sig: string;        // base64url of Ed25519 signature over canonical JSON of {v,hw,tok,fp}
}

/**
 * Wraps three pieces of key material:
 *
 *  1. **Operational CA** (private) — signs per-device operational certs.
 *     Loaded into memory from CA_OPERATIONAL_{CERT,KEY}_PEM.
 *
 *  2. **Attestation root** (public only) — verifies that a device's
 *     attestation cert was signed by a trusted hardware-manufacturing root.
 *     Loaded from CA_ATTESTATION_CERT_PEM. The server must NEVER hold the
 *     attestation root private key; it lives at the factory.
 *
 *  3. **QR signing key** (Ed25519 keypair) — signs QR payloads so the mobile
 *     app can detect tampered stickers. Verification happens on-device with
 *     the Ed25519 public key fetched from /api/provisioning/qr-signing-pubkey.
 *
 * In dev mode, `npm run dev:gen-ca` produces all three as one package.
 */
@Injectable()
export class CaService implements OnModuleInit {
  private readonly logger = new Logger(CaService.name);

  // Operational CA
  private opCert?: forge.pki.Certificate;
  private opKey?: forge.pki.PrivateKey;
  private opCertPem = '';

  // Attestation root (verification only)
  private attCert?: forge.pki.Certificate;

  // Ed25519 QR signing
  private qrPrivateKey?: KeyObject;
  private qrPublicKey?: KeyObject;
  private qrPublicKeyPem = '';

  constructor(private readonly config: AppConfig) {}

  onModuleInit() {
    this.loadOperationalCa();
    this.loadAttestationRoot();
    this.loadQrSigningKey();
  }

  private loadOperationalCa() {
    const { operationalCertPem, operationalKeyPem } = this.config.ca;
    if (!operationalCertPem || !operationalKeyPem) {
      this.logger.warn(
        'Operational CA not configured — run `npm run dev:gen-ca` and set CA_OPERATIONAL_*_PEM.',
      );
      return;
    }
    this.opCert = forge.pki.certificateFromPem(operationalCertPem);
    this.opKey = forge.pki.privateKeyFromPem(operationalKeyPem);
    this.opCertPem = operationalCertPem;
    this.logger.log(`Operational CA loaded: ${this.opCert.subject.getField('CN')?.value}`);
  }

  private loadAttestationRoot() {
    const { attestationCertPem, operationalCertPem } = this.config.ca;
    // Dev fallback: if no separate attestation cert is provided, trust the
    // operational CA as the attestation root too. Production must set
    // CA_ATTESTATION_CERT_PEM to the real factory root.
    const pem = attestationCertPem || operationalCertPem;
    if (!pem) return;
    this.attCert = forge.pki.certificateFromPem(pem);
    this.logger.log(
      `Attestation root loaded: ${this.attCert.subject.getField('CN')?.value}` +
        (attestationCertPem ? '' : ' (DEV FALLBACK — using operational CA)'),
    );
  }

  private loadQrSigningKey() {
    const { privateKeyPem, publicKeyPem } = this.config.qrSigning;
    if (!privateKeyPem || !publicKeyPem) {
      this.logger.warn('QR signing key not configured — QR payloads will be unsigned.');
      return;
    }
    this.qrPrivateKey = createPrivateKey(privateKeyPem);
    this.qrPublicKey = createPublicKey(publicKeyPem);
    this.qrPublicKeyPem = publicKeyPem;
    if (this.qrPrivateKey.asymmetricKeyType !== 'ed25519') {
      throw new Error('QR signing key must be Ed25519');
    }
    this.logger.log('QR signing key loaded (Ed25519)');
  }

  /**
   * Validate that an attestation cert is signed by the attestation root and
   * that its CN matches the expected hardware ID.
   */
  verifyAttestation(attestationCertPem: string, expectedHardwareId: string): boolean {
    if (!this.attCert) {
      this.logger.error('Attestation root not loaded — cannot verify attestation');
      return false;
    }
    try {
      const cert = forge.pki.certificateFromPem(attestationCertPem);
      const cn = cert.subject.getField('CN')?.value;
      if (cn !== expectedHardwareId) {
        this.logger.warn(`Attestation CN mismatch: got ${cn}, expected ${expectedHardwareId}`);
        return false;
      }
      return this.attCert.verify(cert);
    } catch (err) {
      this.logger.warn(`Attestation verify failed: ${(err as Error).message}`);
      return false;
    }
  }

  verifyCsr(csrPem: string, expectedFingerprint: string): forge.pki.CertificateSigningRequest | null {
    try {
      const csr = forge.pki.certificationRequestFromPem(csrPem);
      if (!csr.verify()) return null;
      const fp = this.publicKeyFingerprint(csr.publicKey as forge.pki.PublicKey);
      if (fp !== expectedFingerprint) {
        this.logger.warn(`CSR pubkey fingerprint mismatch: ${fp} vs ${expectedFingerprint}`);
        return null;
      }
      return csr;
    } catch (err) {
      this.logger.warn(`CSR verify failed: ${(err as Error).message}`);
      return null;
    }
  }

  issueOperationalCert(csr: forge.pki.CertificateSigningRequest, hardwareId: string): IssuedCert {
    if (!this.opCert || !this.opKey) {
      throw new Error('Operational CA not initialized — CA_OPERATIONAL_*_PEM missing');
    }
    const cert = forge.pki.createCertificate();
    cert.publicKey = csr.publicKey!;
    cert.serialNumber = randomBytes(16).toString('hex');

    const now = new Date();
    const expires = new Date(now.getTime());
    expires.setDate(expires.getDate() + this.config.ca.operationalCertDays);
    cert.validity.notBefore = now;
    cert.validity.notAfter = expires;

    cert.setSubject([{ name: 'commonName', value: hardwareId }]);
    cert.setIssuer(this.opCert.subject.attributes);
    cert.setExtensions([
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'extKeyUsage', clientAuth: true },
      { name: 'subjectAltName', altNames: [{ type: 2, value: hardwareId }] },
    ]);

    cert.sign(this.opKey as forge.pki.rsa.PrivateKey, forge.md.sha256.create());

    return {
      certPem: forge.pki.certificateToPem(cert),
      chainPem: this.opCertPem,
      serial: cert.serialNumber,
      issuedAt: now,
      expiresAt: expires,
    };
  }

  signQrPayload(payload: { v: number; hw: string; tok: string; fp: string }): SignedQrPayload {
    if (!this.qrPrivateKey) {
      this.logger.warn('QR signing key missing — returning unsigned payload');
      return { ...payload, sig: '' };
    }
    const canonical = JSON.stringify({
      v: payload.v,
      hw: payload.hw,
      tok: payload.tok,
      fp: payload.fp,
    });
    const signature = sign(null, Buffer.from(canonical, 'utf8'), this.qrPrivateKey);
    return { ...payload, sig: signature.toString('base64url') };
  }

  verifyQrPayload(signed: SignedQrPayload): boolean {
    if (!this.qrPublicKey) return false;
    const { sig, ...rest } = signed;
    const canonical = JSON.stringify({ v: rest.v, hw: rest.hw, tok: rest.tok, fp: rest.fp });
    try {
      return verify(null, Buffer.from(canonical, 'utf8'), this.qrPublicKey, Buffer.from(sig, 'base64url'));
    } catch {
      return false;
    }
  }

  qrSigningPublicKeyPem(): string {
    return this.qrPublicKeyPem;
  }

  private publicKeyFingerprint(pubkey: forge.pki.PublicKey): string {
    const der = forge.asn1.toDer(forge.pki.publicKeyToAsn1(pubkey)).getBytes();
    const md = forge.md.sha256.create();
    md.update(der);
    return md.digest().toHex();
  }
}
