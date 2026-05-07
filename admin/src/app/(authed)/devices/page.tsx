import Link from 'next/link';
import { adminFetch, buildPaginationQuery, ListPage } from '@/lib/admin-fetch';
import { DataTable } from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { ListError } from '@/components/list-error';
import { FilterBar, Field, TextField } from '@/components/filter-bar';
import { formatDateTime, formatRelative } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FILTER_KEYS = ['search'] as const;

interface DeviceRow {
  id: string;
  hardwareId: string;
  label: string | null;
  firmwareVer: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  pondId: string;
  pond: { name: string } | null;
  _count: { certificates: number };
}

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { qs, limit, offset, filters } = buildPaginationQuery(searchParams, 50, FILTER_KEYS);
  const result = await adminFetch<ListPage<DeviceRow>>(`/devices${qs}`);
  if ('error' in result) return <ListError title="Devices" error={result.error} />;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-koi-ink">Devices</h1>
      <FilterBar action="/devices" current={filters}>
        <Field label="Search">
          <TextField name="search" defaultValue={filters.search} placeholder="hardware ID or label" />
        </Field>
      </FilterBar>
      <DataTable<DeviceRow>
        rows={result.items}
        columns={[
          {
            header: 'Hardware ID',
            cell: (d) => (
              <Link href={`/devices/${d.id}`} className="hover:text-koi-red hover:underline">
                <code className="text-xs">{d.hardwareId}</code>
              </Link>
            ),
          },
          { header: 'Label', cell: (d) => d.label ?? <span className="text-koi-mute">—</span> },
          { header: 'Pond', cell: (d) => d.pond?.name ?? <span className="text-koi-mute">{d.pondId}</span> },
          { header: 'Firmware', cell: (d) => d.firmwareVer ?? <span className="text-koi-mute">—</span> },
          { header: 'Certs', cell: (d) => d._count.certificates, className: 'tabular-nums' },
          {
            header: 'Last seen',
            cell: (d) =>
              d.lastSeenAt ? (
                <span title={formatDateTime(d.lastSeenAt)}>{formatRelative(d.lastSeenAt)}</span>
              ) : (
                <span className="text-koi-mute">never</span>
              ),
          },
          { header: 'Registered', cell: (d) => formatDateTime(d.createdAt) },
        ]}
        empty="No matching devices."
      />
      <Pagination basePath="/devices" total={result.total} limit={limit} offset={offset} extraParams={filters} />
    </div>
  );
}
