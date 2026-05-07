import { cookies } from 'next/headers';

export const ACCESS_COOKIE = 'koi_admin_at';
export const REFRESH_COOKIE = 'koi_admin_rt';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export function readAccessToken(): string | undefined {
  return cookies().get(ACCESS_COOKIE)?.value;
}

export function setSessionCookies(tokens: SessionTokens) {
  const c = cookies();
  // 30-day refresh + access lives until JWT expiry. We rely on middleware to
  // refresh proactively; if a stale access token reaches the API the user is
  // bounced to /login, which is acceptable v0 behavior.
  c.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  c.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookies() {
  const c = cookies();
  c.delete(ACCESS_COOKIE);
  c.delete(REFRESH_COOKIE);
}
