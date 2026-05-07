import { adminFetch, buildPaginationQuery, ListPage } from '@/lib/admin-fetch';
import { DataTable } from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { ListError } from '@/components/list-error';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface PondRow {
  id: string;
  name: string;
  volumeM3: number;
  koiCount: number;
  latitude: number;
  longitude: number;
  timezone: string;
  createdAt: string;
  _count: { devices: number; members: number };
}

export default async function PondsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { qs, limit, offset } = buildPaginationQuery(searchParams);
  const result = await adminFetch<ListPage<PondRow>>(`/ponds${qs}`);
  if ('error' in result) return <ListError title="Ponds" error={result.error} />;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-koi-ink">Ponds</h1>
      <DataTable<PondRow>
        rows={result.items}
        columns={[
          { header: 'Name', cell: (p) => p.name },
          { header: 'Volume', cell: (p) => `${p.volumeM3.toFixed(1)} m³`, className: 'tabular-nums' },
          { header: 'Koi', cell: (p) => p.koiCount, className: 'tabular-nums' },
          {
            header: 'Stocking',
            cell: (p) => `${(p.koiCount / Math.max(p.volumeM3, 0.01)).toFixed(2)} fish/m³`,
            className: 'tabular-nums',
          },
          {
            header: 'Location',
            cell: (p) => (
              <span className="text-koi-mute">
                {p.latitude.toFixed(2)}, {p.longitude.toFixed(2)}
              </span>
            ),
          },
          { header: 'Devices', cell: (p) => p._count.devices, className: 'tabular-nums' },
          { header: 'Members', cell: (p) => p._count.members, className: 'tabular-nums' },
          { header: 'Created', cell: (p) => formatDateTime(p.createdAt) },
        ]}
        empty="No ponds yet."
      />
      <Pagination basePath="/ponds" total={result.total} limit={limit} offset={offset} />
    </div>
  );
}
