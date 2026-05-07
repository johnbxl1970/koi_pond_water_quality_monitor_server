interface Props {
  title: string;
  error: string;
}

/** Friendlier rendering for "couldn't fetch the list" so the admin doesn't
 *  see a Next.js error overlay during a transient outage. */
export function ListError({ title, error }: Props) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-koi-ink">{title}</h1>
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong className="font-semibold">Couldn&apos;t load:</strong> {error}.
        Check that the NestJS server is running on{' '}
        <code className="rounded bg-amber-100 px-1">{process.env.KOI_SERVER_URL ?? 'http://localhost:3000'}</code>{' '}
        and that <code className="rounded bg-amber-100 px-1">KOI_ADMIN_TOKEN</code>{' '}
        in <code className="rounded bg-amber-100 px-1">admin/.env.local</code>{' '}
        matches the server&apos;s <code className="rounded bg-amber-100 px-1">ADMIN_API_TOKEN</code>.
      </div>
    </div>
  );
}
