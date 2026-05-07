'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-koi-ink px-4 py-2 text-sm font-medium text-white hover:bg-koi-red disabled:opacity-50 transition-colors"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, undefined);
  return (
    <form action={formAction} className="mt-6 space-y-3">
      <label className="block text-sm">
        <span className="text-koi-mute">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="mt-1 w-full rounded-md border border-koi-line bg-white px-3 py-2 text-koi-ink focus:border-koi-red focus:outline-none"
        />
      </label>
      <label className="block text-sm">
        <span className="text-koi-mute">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-koi-line bg-white px-3 py-2 text-koi-ink focus:border-koi-red focus:outline-none"
        />
      </label>
      {state?.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {state.error}
        </div>
      ) : null}
      <SubmitButton />
    </form>
  );
}
