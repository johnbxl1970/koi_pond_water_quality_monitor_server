import { adminFetch } from './admin-fetch';

export interface TelemetryPoint { day: string; count: number }
export interface AlertPoint { day: string; INFO: number; WARNING: number; CRITICAL: number }
export interface PredictionPoint { day: string; total: number; flagged: number }
export interface PondTelemetryPoint { time: string; value: number | null }

export async function getTelemetrySeries(since = '30d'): Promise<TelemetryPoint[]> {
  const r = await adminFetch<TelemetryPoint[]>(`/timeseries/telemetry?since=${since}`);
  return Array.isArray(r) ? r : [];
}

export async function getAlertSeries(since = '30d'): Promise<AlertPoint[]> {
  const r = await adminFetch<AlertPoint[]>(`/timeseries/alerts?since=${since}`);
  return Array.isArray(r) ? r : [];
}

export async function getPredictionSeries(since = '30d'): Promise<PredictionPoint[]> {
  const r = await adminFetch<PredictionPoint[]>(`/timeseries/predictions?since=${since}`);
  return Array.isArray(r) ? r : [];
}

export async function getPondTelemetrySeries(
  pondId: string,
  metric: string,
  since = '24h',
): Promise<PondTelemetryPoint[]> {
  const r = await adminFetch<PondTelemetryPoint[]>(
    `/timeseries/ponds/${pondId}/telemetry?metric=${metric}&since=${since}`,
  );
  return Array.isArray(r) ? r : [];
}
