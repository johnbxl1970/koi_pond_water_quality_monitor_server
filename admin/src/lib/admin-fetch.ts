// Generic fetcher for any /api/admin/* GET. Server-Component only — pulls
// the bearer token from KOI_ADMIN_TOKEN so it never reaches the browser.
//
// All admin lists return the same { items, total, limit, offset } shape, so
// callers get a typed page back with a single helper.

export interface ListPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export async function adminFetch<T>(
  path: string,
): Promise<T | { error: string }> {
  const base = process.env.KOI_SERVER_URL ?? 'http://localhost:3000';
  const token = process.env.KOI_ADMIN_TOKEN;
  if (!token) return { error: 'KOI_ADMIN_TOKEN not set in admin/.env.local' };
  try {
    const res = await fetch(`${base}/api/admin${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return (await res.json()) as T;
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export function buildPaginationQuery(
  searchParams: { [key: string]: string | string[] | undefined },
  defaultLimit = 50,
): { qs: string; limit: number; offset: number } {
  const limit = clampInt(searchParams.limit, defaultLimit, 1, 200);
  const offset = clampInt(searchParams.offset, 0, 0, Number.MAX_SAFE_INTEGER);
  return { qs: `?limit=${limit}&offset=${offset}`, limit, offset };
}

function clampInt(
  raw: string | string[] | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(v ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
