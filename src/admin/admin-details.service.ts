import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  async user(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        dataContributionConsent: true,
        createdAt: true,
        pondMembers: {
          select: {
            role: true,
            pond: { select: { id: true, name: true } },
          },
        },
        _count: { select: { refreshTokens: true } },
      },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async pond(id: string) {
    const pond = await this.prisma.pond.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            role: true,
            user: { select: { id: true, email: true, displayName: true } },
          },
        },
        devices: {
          select: {
            id: true,
            hardwareId: true,
            label: true,
            firmwareVer: true,
            lastSeenAt: true,
            _count: { select: { certificates: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        alertRules: {
          select: {
            id: true,
            metric: true,
            op: true,
            threshold: true,
            severity: true,
            enabled: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        alertEvents: {
          select: {
            id: true,
            metric: true,
            value: true,
            severity: true,
            firedAt: true,
            resolvedAt: true,
          },
          orderBy: { firedAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!pond) throw new NotFoundException(`Pond ${id} not found`);

    const [telemetryCount24h, latestTelemetry, activeAnomalyModel] = await Promise.all([
      this.prisma.telemetry.count({
        where: { pondId: id, time: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.telemetry.findFirst({
        where: { pondId: id },
        orderBy: { time: 'desc' },
      }),
      this.prisma.modelVersion.findFirst({
        where: { pondId: id, kind: 'ANOMALY_SCORE', isActive: true },
        select: { id: true, version: true, trainedAt: true, metadata: true },
      }),
    ]);

    return { ...pond, telemetryCount24h, latestTelemetry, activeAnomalyModel };
  }

  async device(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        pond: { select: { id: true, name: true } },
        certificates: {
          orderBy: { issuedAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!device) throw new NotFoundException(`Device ${id} not found`);

    const recentTelemetry = await this.prisma.telemetry.findMany({
      where: { deviceId: device.id },
      orderBy: { time: 'desc' },
      take: 20,
    });
    return { ...device, recentTelemetry };
  }

  async alert(id: string) {
    const alert = await this.prisma.alertEvent.findUnique({
      where: { id },
      include: {
        pond: { select: { id: true, name: true } },
        rule: true,
      },
    });
    if (!alert) throw new NotFoundException(`Alert ${id} not found`);
    return alert;
  }

  async prediction(id: string) {
    const prediction = await this.prisma.predictionEvent.findUnique({
      where: { id },
      include: { modelVersion: true },
    });
    if (!prediction) throw new NotFoundException(`Prediction ${id} not found`);
    const pond = await this.prisma.pond.findUnique({
      where: { id: prediction.pondId },
      select: { id: true, name: true },
    });
    return { ...prediction, pond };
  }
}
