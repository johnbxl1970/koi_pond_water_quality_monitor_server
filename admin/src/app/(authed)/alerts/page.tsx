import Link from 'next/link';
import { adminFetch, buildPaginationQuery, ListPage } from '@/lib/admin-fetch';
import { DataTable } from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { ListError } from '@/components/list-error';
import { FilterBar, Field, SelectField } from '@/components/filter-bar';
import { formatDateTime, formatRelative } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FILTER_KEYS = ['severity', 'status', 'since'] as const;

type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

interface AlertRow {
  id: string;
  pondId: string;
  metric: string;
  value: number;
  severity: Severity;
  firedAt: string;
  resolvedAt: string | null;
  pond: { name: string } | null;
}

const severityClass: Record<Severity, string> = {
  INFO: 'bg-sky-100 text-sky-800',
  WARNING: 'bg-amber-100 text-amber-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { qs, limit, offset, filters } = buildPaginationQuery(searchParams, 50, FILTER_KEYS);
  const result = await adminFetch<ListPage<AlertRow>>(`/alerts${qs}`);
  if ('error' in result) return <ListError title="Alerts" error={result.error} />;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-koi-ink">Alerts</h1>
      <FilterBar action="/alerts" current={filters}>
        <Field label="Severity">
          <SelectField
            name="severity"
            defaultValue={filters.severity}
            options={[
              { label: 'CRITICAL', value: 'CRITICAL' },
              { label: 'WARNING', value: 'WARNING' },
              { label: 'INFO', value: 'INFO' },
            ]}
          />
        </Field>
        <Field label="Status">
          <SelectField
            name="status"
            defaultValue={filters.status}
            options={[
              { label: 'open', value: 'open' },
              { label: 'resolved', value: 'resolved' },
            ]}
          />
        </Field>
        <Field label="Window">
          <SelectField
            name="since"
            defaultValue={filters.since}
            options={[
              { label: 'last 24h', value: '24h' },
              { label: 'last 7d', value: '7d' },
              { label: 'last 30d', value: '30d' },
            ]}
          />
        </Field>
      </FilterBar>
      <DataTable<AlertRow>
        rows={result.items}
        columns={[
          {
            header: 'Severity',
            cell: (a) => (
              <Link href={`/alerts/${a.id}`} className="hover:underline">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${severityClass[a.severity]}`}>
                  {a.severity}
                </span>
              </Link>
            ),
          },
          { header: 'Pond', cell: (a) => a.pond?.name ?? <span className="text-koi-mute">{a.pondId}</span> },
          { header: 'Metric', cell: (a) => <code className="text-xs">{a.metric}</code> },
          { header: 'Value', cell: (a) => a.value.toFixed(3), className: 'tabular-nums' },
          {
            header: 'Status',
            cell: (a) =>
              a.resolvedAt ? (
                <span className="text-koi-mute">resolved</span>
              ) : (
                <span className="font-medium text-koi-red">open</span>
              ),
          },
          { header: 'Fired', cell: (a) => <span title={formatDateTime(a.firedAt)}>{formatRelative(a.firedAt)}</span> },
        ]}
        empty="No matching alerts."
      />
      <Pagination basePath="/alerts" total={result.total} limit={limit} offset={offset} extraParams={filters} />
    </div>
  );
}
