import Link from 'next/link';

interface Props {
  basePath: string;
  total: number;
  limit: number;
  offset: number;
}

/** Server-rendered Prev/Next links. Reads / writes ?limit & ?offset query
 *  string. Disabled appearance when at the edges. */
export function Pagination({ basePath, total, limit, offset }: Props) {
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;
  const prevHref = `${basePath}?limit=${limit}&offset=${Math.max(0, offset - limit)}`;
  const nextHref = `${basePath}?limit=${limit}&offset=${offset + limit}`;
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
