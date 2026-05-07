import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import mqtt, { MqttClient } from 'mqtt';
import Redis from 'ioredis';
import { AppConfig } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_PUB } from '../redis/redis.module';
import { telemetryPayloadSchema, TelemetryPayload } from './telemetry.schema';
import { AlertsService } from '../alerts/alerts.service';
import { ProvisioningService } from '../provisioning/provisioning.service';
import { computeFreeNh3 } from '../recommendations/free-nh3';

export const STREAM_CHANNEL = (pondId: string) => `telemetry:${pondId}`;

@Injectable()
export class IngestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestService.name);
  private client?: MqttClient;

  constructor(
    private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly provisioning: ProvisioningService,
    @Inject(REDIS_PUB) private readonly pub: Redis,
  ) {}

  onModuleInit() {
    const telemetryTopic = this.config.mqttTelemetryTopic;
    const provisioningTopic = 'provisioning/+/request';
    this.client = mqtt.connect(this.config.mqttUrl, {
      username: this.config.mqttUsername || undefined,
      password: this.config.mqttPassword || undefined,
      reconnectPeriod: 5000,
      clean: false,
      clientId: `koi-server-${process.pid}`,
    });

    // Bridge provisioning responses back through this same client so we
    // don't need a second MQTT connection just to publish issued certs.
    this.provisioning.onIssued = (topic, payload) => {
      this.client?.publish(topic, payload, { qos: 1, retain: false });
    };

    this.client.on('connect', () => {
      this.logger.log(`MQTT connected to ${this.config.mqttUrl}`);
      for (const t of [telemetryTopic, provisioningTopic]) {
        this.client!.subscribe(t, { qos: 1 }, (err) => {
          if (err) this.logger.error(`Subscribe ${t} failed: ${err.message}`);
          else this.logger.log(`Subscribed ${t}`);
        });
      }
    });

    this.client.on('message', (topicIn, payload) => {
      this.handleMessage(topicIn, payload).catch((err) =>
        this.logger.error(`Message handler error: ${err.message}`, err.stack),
      );
    });

    this.client.on('error', (err) => this.logger.error(`MQTT error: ${err.message}`));
  }

  async onModuleDestroy() {
    await new Promise<void>((resolve) => this.client?.end(false, {}, () => resolve()));
  }

  private async handleMessage(topic: string, payload: Buffer) {
    const prov = /^provisioning\/([^/]+)\/request$/.exec(topic);
    if (prov) {
      await this.handleProvisioningRequest(prov[1], payload);
      return;
    }

    // Topic format: koi/{hardwareId}/telemetry
    const match = /^koi\/([^/]+)\/telemetry$/.exec(topic);
    if (!match) {
      this.logger.warn(`Ignoring unexpected topic: ${topic}`);
      return;
    }
    const hardwareId = match[1];

    let json: unknown;
    try {
      json = JSON.parse(payload.toString('utf8'));
    } catch {
      this.logger.warn(`Non-JSON payload on ${topic}`);
      return;
    }

    const parsed = telemetryPayloadSchema.safeParse(json);
    if (!parsed.success) {
      this.logger.warn(`Invalid payload on ${topic}: ${parsed.error.message}`);
      return;
    }

    const device = await this.prisma.device.findUnique({ where: { hardwareId } });
    if (!device) {
      this.logger.warn(`Unknown device hardwareId=${hardwareId} — dropping`);
      return;
    }

    await this.writeTelemetry(device.id, device.pondId, parsed.data);
    await this.prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });
  }

  private async handleProvisioningRequest(hardwareId: string, payload: Buffer) {
    let json: unknown;
    try {
      json = JSON.parse(payload.toString('utf8'));
    } catch {
      this.logger.warn(`Non-JSON provisioning request from ${hardwareId}`);
      return;
    }
    const body = json as {
      csr?: string;
      attestation?: string;
      nonce?: string;
    };
    if (!body.csr || !body.attestation || !body.nonce) {
      this.logger.warn(`Incomplete provisioning request from ${hardwareId}`);
      return;
    }
    await this.provisioning.handleCsr({
      hardwareId,
      csrPem: body.csr,
      attestationCertPem: body.attestation,
      nonce: body.nonce,
    });
  }

  private async writeTelemetry(
    deviceId: string,
    pondId: string,
    p: TelemetryPayload,
  ) {
    const time = p.time ? new Date(p.time) : new Date();
    const nh3FreePpm =
      p.nh3TotalPpm != null && p.phVal != null && p.tempC != null
        ? computeFreeNh3(p.nh3TotalPpm, p.phVal, p.tempC)
        : null;

    const row = {
      time,
      deviceId,
      pondId,
      phaseSeq: p.phaseSeq ?? 0,
      source: 'device',
      phVal: p.phVal ?? null,
      tempC: p.tempC ?? null,
      doMgL: p.doMgL ?? null,
      orpMv: p.orpMv ?? null,
      tdsPpm: p.tdsPpm ?? null,
      turbidityNtu: p.turbidityNtu ?? null,
      nh3TotalPpm: p.nh3TotalPpm ?? null,
      nh3FreePpm,
      no2Ppm: p.no2Ppm ?? null,
      no3Ppm: p.no3Ppm ?? null,
      khDkh: p.khDkh ?? null,
      ghDgh: p.ghDgh ?? null,
      raw: p as object,
    };

    await this.prisma.telemetry.create({ data: row });
    await this.pub.publish(STREAM_CHANNEL(pondId), JSON.stringify(row));
    await this.alerts.evaluate(pondId, row);
  }
}
