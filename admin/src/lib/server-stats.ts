// Stats fetched from the NestJS server's `/api/admin/stats` endpoint.
//
// IMPORTANT: this module runs in Server Components only — never imported into
// a "use client" file — so the bearer token (read from the HttpOnly admin
// cookie) stays on the server.
//
// On any error we degrade gracefully to the `live: false` shape so the
// dashboard renders an obvious "not wired" state rather than 500-ing.

import { readAccessToken } from './cookies';

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

const ZEROS: DashboardStats = {
  live: false,
  users: { total: 0, last7d: 0 },
  ponds: { total: 0, withTelemetry24h: 0 },
  devices: { total: 0, pendingClaims: 0, activeCerts: 0 },
  alerts: { open: 0, critical24h: 0 },
  ai: { activeAnomalyModels: 0, predictionEvents24h: 0, flaggedRate24h: 0 },
  system: { telemetryRowsLast24h: 0, lastWeatherPollMinutesAgo: null },
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const base = process.env.KOI_SERVER_URL ?? 'http://localhost:3000';
  const token = readAccessToken();
  if (!token) {
    return ZEROS;
  }
  try {
    const res = await fetch(`${base}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn(`[admin] /api/admin/stats returned HTTP ${res.status}`);
      return ZEROS;
    }
    return (await res.json()) as DashboardStats;
  } catch (err) {
    console.warn(`[admin] /api/admin/stats fetch failed: ${(err as Error).message}`);
    return ZEROS;
  }
}
