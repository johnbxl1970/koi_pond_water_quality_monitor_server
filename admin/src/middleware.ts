import { NextRequest, NextResponse } from 'next/server';

const ACCESS_COOKIE = 'koi_admin_at';
const REFRESH_COOKIE = 'koi_admin_rt';
const REFRESH_LEAD_SECONDS = 30; // refresh if access exp is within this window

const PUBLIC_PATHS = ['/login'];
const PUBLIC_PREFIXES = ['/_next', '/favicon', '/logo.', '/icon', '/api/_next'];

/**
 * Admin auth middleware. On every request:
 *   1. Allow /login + Next.js internals through unconditionally.
 *   2. Require both cookies to be present; otherwise redirect to /login.
 *   3. If the access token is close to expiring, transparently refresh
 *      using the refresh token and update both cookies inline.
 *
 * Runs on the Edge runtime, so we use a plain base64 decode of the JWT
 * `exp` claim rather than a crypto verify — the API still re-verifies the
 * signature on every call, so this is just for "should we refresh now?".
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  // If the user is already signed in, bounce them off /login back to the dashboard.
  if (PUBLIC_PATHS.includes(pathname)) {
    if (access && refresh) {
      const exp = decodeExp(access);
      if (exp != null && exp - Math.floor(Date.now() / 1000) > REFRESH_LEAD_SECONDS) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
    return NextResponse.next();
  }

  if (!access || !refresh) {
    return redirectToLogin(req);
  }

  const exp = decodeExp(access);
  const nowSec = Math.floor(Date.now() / 1000);
  const stale = exp == null || exp - nowSec < REFRESH_LEAD_SECONDS;
  if (!stale) return NextResponse.next();

  // Refresh inline, then continue to the target route with new cookies set.
  const refreshed = await refreshTokens(refresh);
  if (!refreshed) return redirectToLogin(req, true);
  const res = NextResponse.next();
  setAuthCookies(res, refreshed.accessToken, refreshed.refreshToken);
  return res;
}

function redirectToLogin(req: NextRequest, clear = false) {
  const url = new URL('/login', req.url);
  const res = NextResponse.redirect(url);
  if (clear) {
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
  }
  return res;
}

function decodeExp(jwt: string): number | null {
  try {
    const [, payload] = jwt.split('.');
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const base = process.env.KOI_SERVER_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tokens: { accessToken: string; refreshToken: string } };
    return data.tokens ?? null;
  } catch {
    return null;
  }
}

function setAuthCookies(res: NextResponse, access: string, refresh: string) {
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(ACCESS_COOKIE, access, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
  });
  res.cookies.set(REFRESH_COOKIE, refresh, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export const config = {
  // Run on every page route except Next internals + the brand assets in
  // /public. The matcher is the most reliable place to filter — keeping
  // the middleware body identical for "must be admin" and "edge bypass"
  // is fragile.
  matcher: ['/((?!_next/|api/_next|favicon|logo\\.|icon|\\.).*)'],
};
