/**
 * Sidecar response shapes. These mirror `ml/main.py` response_models and
 * change in lockstep with that file. If you add a prediction kind here,
 * add the matching FastAPI route on the Python side.
 */

export interface SidecarUnavailable {
  available: false;
  reason: string;
  pondId: string;
}

export interface SidecarAnomaly {
  available: true;
  pondId: string;
  score: number;
  flagged: boolean;
  flaggedMetrics: string[];
}

export interface SidecarForecastPoint {
  time: string;
  value: number;
  lower?: number;
  upper?: number;
}

export interface SidecarForecast {
  available: true;
  pondId: string;
  horizonHours: number;
  points: SidecarForecastPoint[];
}

export type AnomalyResult = SidecarAnomaly | SidecarUnavailable;
export type ForecastResult = SidecarForecast | SidecarUnavailable;

export interface Predictions {
  anomaly: AnomalyResult | null;
  doForecast: ForecastResult | null;
  nh3Forecast: ForecastResult | null;
  /** True iff the sidecar was reachable. False on outage / timeout. */
  sidecarReachable: boolean;
}

export interface RetrainTrained {
  pondId: string;
  rowsFit: number;
  modelVersionId: string;
}

export interface RetrainSkipped {
  pondId: string;
  reason: string;
}

export interface RetrainResult {
  trained: RetrainTrained[];
  skipped: RetrainSkipped[];
}
