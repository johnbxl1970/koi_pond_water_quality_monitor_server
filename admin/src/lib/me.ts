import { readAccessToken } from './cookies';

export interface MeResponse {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}

/** Fetches the authenticated user via /auth/me. Returns null on any failure
 *  (no token, expired, network) — the layout renders accordingly. */
export async function getMe(): Promise<MeResponse | null> {
  const base = process.env.KOI_SERVER_URL ?? 'http://localhost:3000';
  const token = readAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as MeResponse;
  } catch {
    return null;
  }
}
