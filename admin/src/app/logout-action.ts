'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies } from '@/lib/cookies';

const SERVER = process.env.KOI_SERVER_URL ?? 'http://localhost:3000';

export async function logoutAction() {
  const refresh = cookies().get(REFRESH_COOKIE)?.value;
  if (refresh) {
    // Best-effort revoke server-side; never block logout on this. If the
    // server is down or the token is already revoked we still clear our
    // cookies and bounce to /login.
    try {
      await fetch(`${SERVER}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
    } catch {
      /* ignore */
    }
  }
  clearSessionCookies();
  // Belt-and-braces: explicit delete in case clearSessionCookies didn't catch
  // any stale variants from a prior cookie domain.
  cookies().delete(ACCESS_COOKIE);
  cookies().delete(REFRESH_COOKIE);
  redirect('/login');
}
