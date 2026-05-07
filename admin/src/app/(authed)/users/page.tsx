import { adminFetch, buildPaginationQuery, ListPage } from '@/lib/admin-fetch';
import { DataTable } from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { ListError } from '@/components/list-error';
import { formatDateTime, formatRelative } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface UserRow {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  dataContributionConsent: boolean;
  _count: { pondMembers: number };
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { qs, limit, offset } = buildPaginationQuery(searchParams);
  const result = await adminFetch<ListPage<UserRow>>(`/users${qs}`);
  if ('error' in result) return <ListError title="Users" error={result.error} />;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-koi-ink">Users</h1>
      <DataTable<UserRow>
        rows={result.items}
        columns={[
          { header: 'Email', cell: (u) => u.email },
          { header: 'Display name', cell: (u) => u.displayName ?? <span className="text-koi-mute">—</span> },
          { header: 'Ponds', cell: (u) => u._count.pondMembers, className: 'tabular-nums' },
          {
            header: 'Data sharing',
            cell: (u) =>
              u.dataContributionConsent ? (
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">opted-in</span>
              ) : (
                <span className="text-koi-mute">no</span>
              ),
          },
          { header: 'Joined', cell: (u) => formatDateTime(u.createdAt) },
          { header: '', cell: (u) => <span className="text-koi-mute">{formatRelative(u.createdAt)}</span> },
        ]}
        empty="No users yet."
      />
      <Pagination basePath="/users" total={result.total} limit={limit} offset={offset} />
    </div>
  );
}
