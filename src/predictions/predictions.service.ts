import { Injectable, Logger } from '@nestjs/common';
import { PredictionKind, Prisma } from '@prisma/client';
import { AppConfig } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnomalyResult,
  ForecastResult,
  Predictions,
  RetrainResult,
} from './predictions.types';

function sinceCutoff(raw: string | undefined): Date | null {
  if (!raw) return null;
  const now = Date.now();
  switch (raw) {
    case '24h': return new Date(now - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
    default: return null;
  }
}

function parseBool(raw: string | undefined): boolean | undefined {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

export interface HistoryFilter {
  limit?: number;
  offset?: number;
  kind?: string;
  flagged?: string;
  since?: string;
}

/** Retrain across all ponds takes seconds-to-minutes depending on fleet size,
 *  so we use a much larger timeout than the inference path's
 *  ML_SIDECAR_TIMEOUT_MS. Anything past 10 minutes likely means the sidecar
 *  is wedged — better to abort than hold a TCP connection open indefinitely. */
const RETRAIN_TIMEOUT_MS = 10 * 60_000;

/**
 * Talks HTTP to the Python ML sidecar. **Every call is graceful**: timeouts,
 * 5xx, and unreachable-sidecar errors return `null` for that prediction kind
 * rather than throwing, so the rule-based recommendation path keeps working
 * even if the sidecar is down or hasn't been deployed yet.
 *
 * The sidecar may also explicitly return `{ available: false }` when its
 * underlying model isn't trained yet — that's surfaced as a SidecarUnavailable
 * object, not null, so callers can tell the difference between "sidecar OK
 * but no model" and "sidecar down".
 */
@Injectable()
export class PredictionsService {
  private readonly logger = new Logger(PredictionsService.name);

  constructor(
    private readonly config: AppConfig,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Pond-scoped history of recorded `PredictionEvent`s, with the same filter
   * surface as the admin lists view (kind / flagged / since) plus
   * pagination. Used by mobile to render a "predictions for this pond"
   * timeline. Doesn't touch the sidecar — these rows are the database's
   * record of what the sidecar has predicted, not a fresh inference.
   */
  async getHistory(pondId: string, filter: HistoryFilter = {}) {
    const limit = Math.max(1, Math.min(filter.limit ?? 50, 200));
    const offset = Math.max(0, filter.offset ?? 0);
    const where: Prisma.PredictionEventWhereInput = { pondId };
    if (
      filter.kind &&
      ['ANOMALY_SCORE', 'DO_FORECAST', 'NH3_FORECAST'].includes(filter.kind)
    ) {
      where.kind = filter.kind as PredictionKind;
    }
    const since = sinceCutoff(filter.since);
    if (since) where.predictedAt = { gte: since };
    const flagged = parseBool(filter.flagged);
    if (flagged !== undefined) {
      where.predicted = { path: ['flagged'], equals: flagged };
    }

    const [items, total] = await Promise.all([
      this.prisma.predictionEvent.findMany({
        where,
        select: {
          id: true,
          kind: true,
          predictedAt: true,
          targetTime: true,
          predicted: true,
          modelVersionId: true,
          modelVersion: { select: { version: true } },
        },
        orderBy: { predictedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.predictionEvent.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  async getPredictions(pondId: string): Promise<Predictions> {
    const [anomaly, doForecast, nh3Forecast] = await Promise.all([
      this.fetchAnomaly(pondId),
      this.fetchDoForecast(pondId),
      this.fetchNh3Forecast(pondId),
    ]);

    const sidecarReachable =
      anomaly !== null || doForecast !== null || nh3Forecast !== null;

    return { anomaly, doForecast, nh3Forecast, sidecarReachable };
  }

  private fetchAnomaly(pondId: string): Promise<AnomalyResult | null> {
    return this.get<AnomalyResult>(
      `/predict/anomaly?pondId=${encodeURIComponent(pondId)}`,
    );
  }

  private fetchDoForecast(pondId: string): Promise<ForecastResult | null> {
    return this.get<ForecastResult>(
      `/predict/do?pondId=${encodeURIComponent(pondId)}`,
    );
  }

  private fetchNh3Forecast(pondId: string): Promise<ForecastResult | null> {
    return this.get<ForecastResult>(
      `/predict/nh3?pondId=${encodeURIComponent(pondId)}`,
    );
  }

  private async get<T>(path: string): Promise<T | null> {
    const { url, timeoutMs } = this.config.mlSidecar;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${url}${path}`, { signal: controller.signal });
      if (!res.ok) {
        this.logger.warn(`ML sidecar ${path} returned HTTP ${res.status}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (err) {
      this.logger.warn(`ML sidecar ${path} unreachable: ${(err as Error).message}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Trigger a sidecar-side fit across all ponds. Returns null on outage. */
  async triggerAnomalyRetrain(): Promise<RetrainResult | null> {
    const { url } = this.config.mlSidecar;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RETRAIN_TIMEOUT_MS);
    try {
      const res = await fetch(`${url}/retrain/anomaly`, {
        method: 'POST',
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`ML sidecar /retrain/anomaly returned HTTP ${res.status}`);
        return null;
      }
      return (await res.json()) as RetrainResult;
    } catch (err) {
      this.logger.warn(`ML sidecar /retrain/anomaly failed: ${(err as Error).message}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
