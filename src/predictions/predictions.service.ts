import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../config/config.service';
import {
  AnomalyResult,
  ForecastResult,
  Predictions,
} from './predictions.types';

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

  constructor(private readonly config: AppConfig) {}

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
}
