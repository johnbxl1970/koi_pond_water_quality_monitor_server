import Link from 'next/link';

interface Props {
  basePath: string;
  total: number;
  limit: number;
  offset: number;
  /** Additional search params (filters etc.) preserved across page navigation. */
  extraParams?: Record<string, string | undefined>;
}

function buildHref(
  basePath: string,
  limit: number,
  offset: number,
  extra: Record<string, string | undefined> = {},
): string {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== '') params.set(k, v);
  }
  return `${basePath}?${params.toString()}`;
}

/** Server-rendered Prev/Next links. Preserves filter params (severity,
 *  search, etc.) so paging through a filtered view doesn't drop them. */
export function Pagination({ basePath, total, limit, offset, extraParams = {} }: Props) {
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;
  const prevHref = buildHref(basePath, limit, Math.max(0, offset - limit), extraParams);
  const nextHref = buildHref(basePath, limit, offset + limit, extraParams);
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-koi-mute">
      <div>
        {start}–{end} of {total}
      </div>
      <div className="flex gap-2">
        {hasPrev ? (
          <Link
            href={prevHref}
            className="rounded-md border border-koi-line bg-white px-3 py-1 hover:bg-koi-line/30"
          >
            Prev
          </Link>
        ) : (
          <span className="rounded-md border border-koi-line bg-koi-line/30 px-3 py-1 text-koi-mute/50">
            Prev
          </span>
        )}
        {hasNext ? (
          <Link
            href={nextHref}
            className="rounded-md border border-koi-line bg-white px-3 py-1 hover:bg-koi-line/30"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-md border border-koi-line bg-koi-line/30 px-3 py-1 text-koi-mute/50">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
