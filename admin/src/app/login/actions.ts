'use server';

import { redirect } from 'next/navigation';
import { setSessionCookies } from '@/lib/cookies';

interface LoginResponse {
  tokens: { accessToken: string; refreshToken: string };
  user: { id: string; email: string; isAdmin?: boolean };
}

interface MeResponse {
  id: string;
  email: string;
  isAdmin: boolean;
}

const SERVER = process.env.KOI_SERVER_URL ?? 'http://localhost:3000';

export async function loginAction(_prev: { error?: string } | undefined, fd: FormData) {
  const email = String(fd.get('email') ?? '');
  const password = String(fd.get('password') ?? '');
  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  let loginRes: Response;
  try {
    loginRes = await fetch(`${SERVER}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch (err) {
    return { error: `Couldn't reach server (${(err as Error).message})` };
  }
  if (loginRes.status === 401) {
    return { error: 'Invalid credentials.' };
  }
  if (!loginRes.ok) {
    return { error: `Login failed (HTTP ${loginRes.status})` };
  }
  const login = (await loginRes.json()) as LoginResponse;

  // Verify the user is actually an admin before storing the session — admins
  // and regular users share the same auth surface; we gate at the cookie
  // step so a non-admin login can't leave a usable session behind.
  const meRes = await fetch(`${SERVER}/api/auth/me`, {
    headers: { Authorization: `Bearer ${login.tokens.accessToken}` },
    cache: 'no-store',
  });
  if (!meRes.ok) {
    return { error: 'Could not verify admin status after login.' };
  }
  const me = (await meRes.json()) as MeResponse;
  if (!me.isAdmin) {
    return { error: 'This account is not an admin. Ask an existing admin to promote you.' };
  }

  setSessionCookies(login.tokens);
  redirect('/');
}
