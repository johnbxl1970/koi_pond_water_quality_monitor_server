import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardStats {
  live: boolean;
  users: { total: number; last7d: number };
  ponds: { total: number; withTelemetry24h: number };
  devices: { total: number; pendingClaims: number; activeCerts: number };
  alerts: { open: number; critical24h: number };
  ai: {
    activeAnomalyModels: number;
    predictionEvents24h: number;
    flaggedRate24h: number;
  };
  system: {
    telemetryRowsLast24h: number;
    lastWeatherPollMinutesAgo: number | null;
  };
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStats> {
    const now = new Date();
    const ago7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      usersTotal,
      usersLast7d,
      pondsTotal,
      pondsActiveRows,
      devicesTotal,
      pendingClaims,
      activeCerts,
      alertsOpen,
      alertsCritical24h,
      activeAnomalyModels,
      predictionEvents24h,
      flaggedRows,
      telemetry24h,
      latestWeather,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: ago7d } } }),
      this.prisma.pond.count(),
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT "pondId")::bigint AS count
        FROM "Telemetry"
        WHERE "time" >= ${ago24h}`,
      this.prisma.device.count(),
      this.prisma.deviceClaim.count({ where: { status: 'PENDING' } }),
      this.prisma.deviceCertificate.count({ where: { status: 'ACTIVE' } }),
      this.prisma.alertEvent.count({ where: { resolvedAt: null } }),
      this.prisma.alertEvent.count({
        where: { firedAt: { gte: ago24h }, severity: 'CRITICAL' },
      }),
      this.prisma.modelVersion.count({
        where: { kind: 'ANOMALY_SCORE', isActive: true },
      }),
      this.prisma.predictionEvent.count({ where: { predictedAt: { gte: ago24h } } }),
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "PredictionEvent"
        WHERE "predictedAt" >= ${ago24h}
          AND (predicted->>'flagged')::boolean = true`,
      this.prisma.telemetry.count({ where: { time: { gte: ago24h } } }),
      this.prisma.weatherForecast.findFirst({ orderBy: { fetchedAt: 'desc' } }),
    ]);

    const flaggedCount = Number(flaggedRows[0]?.count ?? 0n);
    const flaggedRate24h =
      predictionEvents24h > 0 ? flaggedCount / predictionEvents24h : 0;
    const pondsActive24h = Number(pondsActiveRows[0]?.count ?? 0n);
    const lastWeatherPollMinutesAgo = latestWeather
      ? Math.round((now.getTime() - latestWeather.fetchedAt.getTime()) / 60000)
      : null;

    return {
      live: true,
      users: { total: usersTotal, last7d: usersLast7d },
      ponds: { total: pondsTotal, withTelemetry24h: pondsActive24h },
      devices: {
        total: devicesTotal,
        pendingClaims,
        activeCerts,
      },
      alerts: { open: alertsOpen, critical24h: alertsCritical24h },
      ai: {
        activeAnomalyModels,
        predictionEvents24h,
        flaggedRate24h,
      },
      system: {
        telemetryRowsLast24h: telemetry24h,
        lastWeatherPollMinutesAgo,
      },
    };
  }
}
