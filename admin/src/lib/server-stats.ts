// Stat fetching layer. Today these read from a not-yet-built admin REST
// surface on the NestJS server (`/api/admin/stats`). Auth + endpoint are
// stubbed — the function returns placeholder zeros + a `live: false` flag
// that the dashboard renders distinctly so it's obvious the wiring isn't
// done yet. Implement the matching `AdminStatsController` next, then flip
// `live` to true here.

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
  system: { telemetryRowsLast24h: number; lastWeatherPollMinutesAgo: number | null };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Hook-up point: replace this with `fetch('/api/admin/stats', ...)` once
  // the controller exists. Until then we surface zeros and the `live: false`
  // banner — better than fake numbers that look real.
  return {
    live: false,
    users: { total: 0, last7d: 0 },
    ponds: { total: 0, withTelemetry24h: 0 },
    devices: { total: 0, pendingClaims: 0, activeCerts: 0 },
    alerts: { open: 0, critical24h: 0 },
    ai: { activeAnomalyModels: 0, predictionEvents24h: 0, flaggedRate24h: 0 },
    system: { telemetryRowsLast24h: 0, lastWeatherPollMinutesAgo: null },
  };
}
