import Link from 'next/link';
import { adminFetch, buildPaginationQuery, ListPage } from '@/lib/admin-fetch';
import { DataTable } from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { ListError } from '@/components/list-error';
import { FilterBar, Field, SelectField } from '@/components/filter-bar';
import {
  formatBytes,
  formatDateTime,
  formatDurationMs,
  formatNumber,
  formatRelative,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

const FILTER_KEYS = ['kind', 'flagged', 'since'] as const;
const MODEL_FILTER_KEYS = ['mkind', 'mactive', 'msince'] as const;
const MODEL_LIMIT = 25;

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

interface ModelRow {
  id: string;
  kind: Kind;
  pondId: string | null;
  version: string;
  trainedAt: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
  pond: { name: string } | null;
  _count: { events: number };
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

function modelTraining(metadata: Record<string, unknown>): string {
  const rows = typeof metadata.rowsFit === 'number' ? metadata.rowsFit : null;
  const algo = typeof metadata.algorithm === 'string' ? metadata.algorithm : null;
  const parts: string[] = [];
  if (algo) parts.push(algo);
  if (rows !== null) parts.push(`${rows} rows`);
  return parts.join(' · ');
}

function metaNumber(metadata: Record<string, unknown>, key: string): number | null {
  const v = metadata[key];
  return typeof v === 'number' ? v : null;
}

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const pred = buildPaginationQuery(searchParams, 50, FILTER_KEYS);

  // Model log lives on the same page; use mkind/mactive/msince so they
  // don't collide with the predictions filter keys above.
  const mFilters: Record<string, string | undefined> = {};
  const mParams = new URLSearchParams();
  mParams.set('limit', String(MODEL_LIMIT));
  for (const k of MODEL_FILTER_KEYS) {
    const raw = searchParams[k];
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (v !== undefined && v !== '') {
      mFilters[k] = v;
      // Strip the m-prefix when forwarding to the API.
      mParams.set(k.slice(1), v);
    } else {
      mFilters[k] = undefined;
    }
  }

  const [predResult, modelResult] = await Promise.all([
    adminFetch<ListPage<PredictionRow>>(`/predictions${pred.qs}`),
    adminFetch<ListPage<ModelRow>>(`/models?${mParams.toString()}`),
  ]);

  if ('error' in predResult) return <ListError title="Predictions" error={predResult.error} />;
  if ('error' in modelResult) return <ListError title="Predictions" error={modelResult.error} />;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-koi-ink">AI / Predictions</h1>
        <h2 className="text-lg font-medium text-koi-ink">
          Model versions{' '}
          <span className="text-sm font-normal text-koi-mute">
            (showing {modelResult.items.length} of {modelResult.total})
          </span>
        </h2>
        <FilterBar action="/predictions" current={mFilters}>
          {/* Preserve the prediction-events filters when changing model filters. */}
          {Object.entries(pred.filters).map(([k, v]) =>
            v ? <input key={k} type="hidden" name={k} value={v} /> : null,
          )}
          <Field label="Kind">
            <SelectField
              name="mkind"
              defaultValue={mFilters.mkind}
              options={[
                { label: 'anomaly', value: 'ANOMALY_SCORE' },
                { label: 'DO forecast', value: 'DO_FORECAST' },
                { label: 'NH3 forecast', value: 'NH3_FORECAST' },
              ]}
            />
          </Field>
          <Field label="Active">
            <SelectField
              name="mactive"
              defaultValue={mFilters.mactive}
              options={[
                { label: 'active', value: 'true' },
                { label: 'retired', value: 'false' },
              ]}
            />
          </Field>
          <Field label="Window">
            <SelectField
              name="msince"
              defaultValue={mFilters.msince}
              options={[
                { label: 'last 24h', value: '24h' },
                { label: 'last 7d', value: '7d' },
                { label: 'last 30d', value: '30d' },
              ]}
            />
          </Field>
        </FilterBar>
        <DataTable<ModelRow>
          rows={modelResult.items}
          columns={[
            {
              header: 'Version',
              cell: (m) => (
                <code className="text-xs" title={m.id}>
                  {m.version}
                </code>
              ),
            },
            { header: 'Kind', cell: (m) => <code className="text-xs">{m.kind}</code> },
            {
              header: 'Pond',
              cell: (m) =>
                m.pondId ? (
                  <span className="text-xs" title={m.pondId}>
                    {m.pond?.name ?? m.pondId}
                  </span>
                ) : (
                  <span className="text-xs text-koi-mute">global</span>
                ),
            },
            {
              header: 'Training',
              cell: (m) => (
                <span className="text-xs text-koi-mute">{modelTraining(m.metadata)}</span>
              ),
            },
            {
              header: 'Size',
              cell: (m) => (
                <span className="text-xs">{formatBytes(metaNumber(m.metadata, 'artifactSizeBytes'))}</span>
              ),
            },
            {
              header: 'Train time',
              cell: (m) => (
                <span className="text-xs">{formatDurationMs(metaNumber(m.metadata, 'fitDurationMs'))}</span>
              ),
            },
            {
              header: 'Params',
              cell: (m) => (
                <span className="text-xs" title="Total decision-tree node count across the forest">
                  {formatNumber(metaNumber(m.metadata, 'paramCount'))}
                </span>
              ),
            },
            {
              header: 'Predictions',
              cell: (m) => <span className="text-xs">{m._count.events}</span>,
            },
            {
              header: 'Status',
              cell: (m) =>
                m.isActive ? (
                  <span className="text-koi-green font-medium">active</span>
                ) : (
                  <span className="text-koi-mute">retired</span>
                ),
            },
            {
              header: 'Trained',
              cell: (m) => (
                <span title={formatDateTime(m.trainedAt)}>{formatRelative(m.trainedAt)}</span>
              ),
            },
          ]}
          empty="No model versions yet."
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-koi-ink">Prediction events</h2>
        <FilterBar action="/predictions" current={pred.filters}>
          {/* Preserve the model filters when changing prediction filters. */}
          {Object.entries(mFilters).map(([k, v]) =>
            v ? <input key={k} type="hidden" name={k} value={v} /> : null,
          )}
          <Field label="Kind">
            <SelectField
              name="kind"
              defaultValue={pred.filters.kind}
              options={[
                { label: 'anomaly', value: 'ANOMALY_SCORE' },
                { label: 'DO forecast', value: 'DO_FORECAST' },
                { label: 'NH3 forecast', value: 'NH3_FORECAST' },
              ]}
            />
          </Field>
          <Field label="Flagged">
            <SelectField
              name="flagged"
              defaultValue={pred.filters.flagged}
              options={[
                { label: 'flagged', value: 'true' },
                { label: 'normal', value: 'false' },
              ]}
            />
          </Field>
          <Field label="Window">
            <SelectField
              name="since"
              defaultValue={pred.filters.since}
              options={[
                { label: 'last 24h', value: '24h' },
                { label: 'last 7d', value: '7d' },
                { label: 'last 30d', value: '30d' },
              ]}
            />
          </Field>
        </FilterBar>
        <DataTable<PredictionRow>
          rows={predResult.items}
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
          empty="No matching predictions."
        />
        <Pagination
          basePath="/predictions"
          total={predResult.total}
          limit={pred.limit}
          offset={pred.offset}
          extraParams={{ ...pred.filters, ...mFilters }}
        />
      </div>
    </div>
  );
}
