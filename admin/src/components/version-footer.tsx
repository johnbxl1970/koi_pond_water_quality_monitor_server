import { adminFetch } from '@/lib/admin-fetch';

interface VersionInfo {
  commit: string;
  source: 'env' | 'git' | 'unknown';
}

/** Sidebar footer showing the git commit each side is running.
 *  Server component — fetches the server commit on render and reads the
 *  admin commit from a build-time-injected env var. */
export async function VersionFooter() {
  const adminCommit = process.env.NEXT_PUBLIC_GIT_COMMIT ?? 'unknown';
  const serverResult = await adminFetch<VersionInfo>('/version');
  const serverCommit = 'error' in serverResult ? 'unreachable' : serverResult.commit;

  return (
    <div className="border-t border-koi-line/60 px-3 py-3 text-[11px] text-koi-mute">
      <div className="flex justify-between">
        <span>admin</span>
        <code className="text-koi-ink">{adminCommit}</code>
      </div>
      <div className="mt-1 flex justify-between">
        <span>server</span>
        <code className={serverCommit === 'unreachable' ? 'text-koi-red' : 'text-koi-ink'}>
          {serverCommit}
        </code>
      </div>
    </div>
  );
}
