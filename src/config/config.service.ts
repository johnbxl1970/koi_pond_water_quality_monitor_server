import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get nodeEnv() { return this.config.get('NODE_ENV', { infer: true }); }
  get httpPort() { return this.config.get('HTTP_PORT', { infer: true }); }
  get adminApiToken() { return this.config.get('ADMIN_API_TOKEN', { infer: true }); }

  get jwt() {
    return {
      accessSecret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      refreshSecret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      accessTtlSeconds: this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }),
      refreshTtlSeconds: this.config.get('JWT_REFRESH_TTL_SECONDS', { infer: true }),
    };
  }

  get databaseUrl() { return this.config.get('DATABASE_URL', { infer: true }); }

  get redisUrl() { return this.config.get('REDIS_URL', { infer: true }); }

  get mqttUrl() { return this.config.get('MQTT_URL', { infer: true }); }
  get mqttUsername() { return this.config.get('MQTT_USERNAME', { infer: true }); }
  get mqttPassword() { return this.config.get('MQTT_PASSWORD', { infer: true }); }
  get mqttTelemetryTopic() { return this.config.get('MQTT_TELEMETRY_TOPIC', { infer: true }); }

  get openMeteoBaseUrl() { return this.config.get('OPEN_METEO_BASE_URL', { infer: true }); }

  get fcm() {
    return {
      projectId: this.config.get('FCM_PROJECT_ID', { infer: true }),
      clientEmail: this.config.get('FCM_CLIENT_EMAIL', { infer: true }),
      privateKey: this.config.get('FCM_PRIVATE_KEY', { infer: true }),
    };
  }

  get ca() {
    return {
      operationalCertPem: this.config.get('CA_OPERATIONAL_CERT_FILE', { infer: true }),
      operationalKeyPem: this.config.get('CA_OPERATIONAL_KEY_FILE', { infer: true }),
      attestationCertPem: this.config.get('CA_ATTESTATION_CERT_FILE', { infer: true }),
      operationalCertDays: this.config.get('CA_OPERATIONAL_CERT_DAYS', { infer: true }),
    };
  }

  get qrSigning() {
    return {
      privateKeyPem: this.config.get('QR_SIGNING_PRIVATE_KEY_FILE', { infer: true }),
      publicKeyPem: this.config.get('QR_SIGNING_PUBLIC_KEY_FILE', { infer: true }),
    };
  }

  get claimTokenTtlDays() { return this.config.get('CLAIM_TOKEN_TTL_DAYS', { infer: true }); }
  get pendingCsrTtlSeconds() { return this.config.get('PENDING_CSR_TTL_SECONDS', { infer: true }); }

  get mlSidecar() {
    return {
      url: this.config.get('ML_SIDECAR_URL', { infer: true }),
      timeoutMs: this.config.get('ML_SIDECAR_TIMEOUT_MS', { infer: true }),
    };
  }
}
