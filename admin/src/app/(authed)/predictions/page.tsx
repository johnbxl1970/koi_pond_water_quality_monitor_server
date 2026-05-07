import Link from 'next/link';
import { adminFetch, buildPaginationQuery, ListPage } from '@/lib/admin-fetch';
import { DataTable } from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { ListError } from '@/components/list-error';
import { formatDateTime, formatRelative } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Kind = 'ANOMALY_SCORE' | 'DO_FORECAST' | 'NH3_FORECAST';

interface PredictionRow {
  id: string;
  pondId: string;
  kind: Kind;
  predictedAt: string;
  targetTime: string;
  predicted: Record<string, unknown>;
  modelVersionId: string;
  modelVersion: { version: string } | null;
}

function summarize(kind: Kind, predicted: Record<string, unknown>): React.ReactNode {
  if (kind === 'ANOMALY_SCORE') {
    const flagged = Boolean(predicted.flagged);
    const score = typeof predicted.score === 'number' ? predicted.score : null;
    const metrics = Array.isArray(predicted.flaggedMetrics)
      ? (predicted.flaggedMetrics as string[]).join(', ')
      : '';
    return (
      <span className={flagged ? 'text-koi-red font-medium' : 'text-koi-ink'}>
        {flagged ? 'flagged' : 'normal'}
        {score !== null ? ` (${score.toFixed(3)})` : ''}
        {flagged && metrics ? ` — ${metrics}` : ''}
      </span>
    );
  }
  return <code className="text-xs text-koi-mute">{JSON.stringify(predicted)}</code>;
}

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { qs, limit, offset } = buildPaginationQuery(searchParams);
  const result = await adminFetch<ListPage<PredictionRow>>(`/predictions${qs}`);
  if ('error' in result) return <ListError title="Predictions" error={result.error} />;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-koi-ink">AI / Predictions</h1>
      <DataTable<PredictionRow>
        rows={result.items}
        columns={[
          {
            header: 'Kind',
            cell: (p) => (
              <Link href={`/predictions/${p.id}`} className="hover:text-koi-red hover:underline">
                <code className="text-xs">{p.kind}</code>
              </Link>
            ),
          },
          { header: 'Pond', cell: (p) => <span className="text-xs">{p.pondId}</span> },
          { header: 'Result', cell: (p) => summarize(p.kind, p.predicted) },
          {
            header: 'Model',
            cell: (p) => (
              <span className="text-xs text-koi-mute" title={p.modelVersionId}>
                {p.modelVersion?.version ?? p.modelVersionId.slice(0, 8)}
              </span>
            ),
          },
          {
            header: 'When',
            cell: (p) => (
              <span title={formatDateTime(p.predictedAt)}>{formatRelative(p.predictedAt)}</span>
            ),
          },
        ]}
        empty="No predictions written yet — run a /predict/* call against the ML sidecar."
      />
      <Pagination basePath="/predictions" total={result.total} limit={limit} offset={offset} />
    </div>
  );
}
