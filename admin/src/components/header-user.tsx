import { logoutAction } from '@/app/logout-action';
import { getMe } from '@/lib/me';

export async function HeaderUser() {
  const me = await getMe();
  if (!me) {
    return <span className="text-xs text-koi-mute">Internal admin portal</span>;
  }
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-koi-mute">
        Signed in as <span className="text-koi-ink font-medium">{me.email}</span>
      </span>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-md border border-koi-line bg-white px-3 py-1 text-koi-ink hover:border-koi-red hover:text-koi-red transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
