import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function sinceCutoff(raw: string | undefined): Date {
  const now = Date.now();
  switch (raw) {
    case '24h': return new Date(now - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '30d':
    default: return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
}

/** Telemetry uses TimescaleDB's time_bucket() for proper hypertable indexing.
 *  The other tables aren't hypertables, so date_trunc is fine.
 *
 *  Bigint counts coming back from raw queries are coerced to Number — at
 *  admin-volume traffic the values fit comfortably within JS's 2^53. */
@Injectable()
export class AdminTimeseriesService {
  constructor(private readonly prisma: PrismaService) {}

  async telemetryByDay(since?: string) {
    const cutoff = sinceCutoff(since);
    const rows = await this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT
        time_bucket('1 day', "time") AS day,
        COUNT(*)::bigint AS count
      FROM "Telemetry"
      WHERE "time" >= ${cutoff}
      GROUP BY day
      ORDER BY day ASC
    `;
    return rows.map((r) => ({ day: r.day.toISOString(), count: Number(r.count) }));
  }

  async alertsByDay(since?: string) {
    const cutoff = sinceCutoff(since);
    const rows = await this.prisma.$queryRaw<
      { day: Date; severity: string; count: bigint }[]
    >`
      SELECT
        date_trunc('day', "firedAt") AS day,
        severity::text AS severity,
        COUNT(*)::bigint AS count
      FROM "AlertEvent"
      WHERE "firedAt" >= ${cutoff}
      GROUP BY day, severity
      ORDER BY day ASC
    `;
    // Pivot severity into columns for easy stacking on the client.
    const byDay = new Map<string, { day: string; INFO: number; WARNING: number; CRITICAL: number }>();
    for (const r of rows) {
      const key = r.day.toISOString();
      if (!byDay.has(key)) byDay.set(key, { day: key, INFO: 0, WARNING: 0, CRITICAL: 0 });
      const bucket = byDay.get(key)!;
      if (r.severity === 'INFO' || r.severity === 'WARNING' || r.severity === 'CRITICAL') {
        bucket[r.severity] = Number(r.count);
      }
    }
    return [...byDay.values()];
  }

  async predictionsByDay(since?: string) {
    const cutoff = sinceCutoff(since);
    const rows = await this.prisma.$queryRaw<
      { day: Date; total: bigint; flagged: bigint }[]
    >`
      SELECT
        date_trunc('day', "predictedAt") AS day,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE (predicted->>'flagged')::boolean = true)::bigint AS flagged
      FROM "PredictionEvent"
      WHERE "predictedAt" >= ${cutoff}
      GROUP BY day
      ORDER BY day ASC
    `;
    return rows.map((r) => ({
      day: r.day.toISOString(),
      total: Number(r.total),
      flagged: Number(r.flagged),
    }));
  }

  /** Hourly average of a single telemetry metric for one pond. Used by the
   *  pond detail page so each pond has a glanceable readings chart. */
  async pondTelemetrySeries(pondId: string, metric: string, since?: string) {
    const allowed = new Set([
      'phVal', 'tempC', 'doMgL', 'orpMv', 'tdsPpm', 'turbidityNtu',
      'nh3TotalPpm', 'nh3FreePpm', 'no2Ppm', 'no3Ppm', 'khDkh', 'ghDgh',
    ]);
    if (!allowed.has(metric)) return [];
    const cutoff = sinceCutoff(since);
    const bucket = since === '24h' ? '15 minutes' : '1 hour';
    // Column is dynamic — we only allow names from the whitelist above, so
    // string interpolation is safe here. Prisma's $queryRawUnsafe is the
    // right primitive for this case.
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
