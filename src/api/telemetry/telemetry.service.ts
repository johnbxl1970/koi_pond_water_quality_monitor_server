import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ALLOWED_METRICS = new Set([
  'phVal', 'tempC', 'doMgL', 'orpMv', 'tdsPpm', 'turbidityNtu',
  'nh3TotalPpm', 'nh3FreePpm', 'no2Ppm', 'no3Ppm', 'khDkh', 'ghDgh',
]);

function sinceCutoff(raw: string | undefined): Date {
  const now = Date.now();
  switch (raw) {
    case '24h': return new Date(now - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
    default: return new Date(now - 24 * 60 * 60 * 1000);
  }
}

@Injectable()
export class TelemetryService {
  constructor(private readonly prisma: PrismaService) {}

  async query(pondId: string, windowMs: number, limit: number) {
    const since = new Date(Date.now() - windowMs);
    return this.prisma.telemetry.findMany({
      where: { pondId, time: { gte: since } },
      orderBy: { time: 'desc' },
      take: limit,
    });
  }

  /**
   * Time-bucketed series for a single telemetry metric on one pond.
   * Used by both the user-facing pond-scoped route and the admin timeseries
   * controller so chart shapes stay identical across surfaces. The metric
   * name is whitelisted before any string interpolation — only members of
   * ALLOWED_METRICS can land in the SQL.
   */
  async series(pondId: string, metric: string, since?: string) {
    if (!ALLOWED_METRICS.has(metric)) return [];
    const cutoff = sinceCutoff(since);
    const bucket = since === '24h' ? '15 minutes' : '1 hour';
    const rows = await this.prisma.$queryRawUnsafe<{ ts: Date; avg: number | null }[]>(
      `
        SELECT
          time_bucket($1, "time") AS ts,
          AVG("${metric}") AS avg
        FROM "Telemetry"
        WHERE "pondId" = $2
          AND "time" >= $3
          AND "${metric}" IS NOT NULL
        GROUP BY ts
        ORDER BY ts ASC
      `,
      bucket,
      pondId,
      cutoff,
    );
    return rows.map((r) => ({
      time: r.ts.toISOString(),
      value: r.avg == null ? null : Number(r.avg),
    }));
  }
}
