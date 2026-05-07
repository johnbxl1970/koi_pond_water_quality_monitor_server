import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
import { ListError } from '@/components/list-error';
import { DetailCard, Section } from '@/components/detail-card';
import { formatDateTime, formatRelative } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Kind = 'ANOMALY_SCORE' | 'DO_FORECAST' | 'NH3_FORECAST';

interface PredictionDetail {
  id: string;
  pondId: string;
  kind: Kind;
  predictedAt: string;
  targetTime: string;
  predicted: Record<string, unknown>;
  actualForTime: string | null;
  actual: Record<string, unknown> | null;
  modelVersionId: string;
  modelVersion: {
    id: string;
    kind: Kind;
    version: string;
    artifactPath: string;
    metadata: Record<string, unknown>;
    trainedAt: string;
    isActive: boolean;
    pondId: string | null;
  };
  pond: { id: string; name: string } | null;
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
        {score !== null ? ` (score ${score.toFixed(3)})` : ''}
        {flagged && metrics ? ` — ${metrics}` : ''}
      </span>
    );
  }
  return <code className="text-xs text-koi-mute">{JSON.stringify(predicted)}</code>;
}

export default async function PredictionDetailPage({ params }: { params: { id: string } }) {
  const p = await adminFetch<PredictionDetail>(`/predictions/${params.id}`);
  if ('error' in p) return <ListError title="Prediction" error={p.error} />;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/predictions" className="text-xs text-koi-mute hover:text-koi-red">← Predictions</Link>
        <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold text-koi-ink">
          <code className="text-base">{p.kind}</code>
          {summarize(p.kind, p.predicted)}
        </h1>
      </div>

      <DetailCard
        title="Event"
        rows={[
          { label: 'ID', value: <code className="text-xs">{p.id}</code> },
          {
            label: 'Pond',
            value: p.pond ? (
              <Link href={`/ponds/${p.pond.id}`} className="text-koi-ink hover:text-koi-red hover:underline">
                {p.pond.name}
              </Link>
            ) : (
              <span className="text-koi-mute">{p.pondId}</span>
            ),
          },
          { label: 'Predicted at', value: `${formatDateTime(p.predictedAt)} (${formatRelative(p.predictedAt)})` },
          { label: 'Target time', value: formatDateTime(p.targetTime) },
          {
            label: 'Back-tested',
            value: p.actualForTime ? (
              <span>actual recorded at {formatDateTime(p.actualForTime)}</span>
            ) : (
              <span className="text-koi-mute">not yet</span>
            ),
          },
        ]}
      />

      <Section title="Predicted">
        <pre className="overflow-x-auto rounded-md border border-koi-line bg-white p-4 text-xs text-koi-ink">
{JSON.stringify(p.predicted, null, 2)}
        </pre>
      </Section>

      {p.actual ? (
        <Section title="Actual">
          <pre className="overflow-x-auto rounded-md border border-koi-line bg-white p-4 text-xs text-koi-ink">
{JSON.stringify(p.actual, null, 2)}
          </pre>
        </Section>
      ) : null}

      <DetailCard
        title="Model"
        rows={[
          { label: 'Version', value: <code className="text-xs">{p.modelVersion.version}</code> },
          { label: 'Kind', value: <code className="text-xs">{p.modelVersion.kind}</code> },
          {
            label: 'Scope',
            value: p.modelVersion.pondId ? (
              <span>per-pond ({<code className="text-xs">{p.modelVersion.pondId}</code>})</span>
            ) : (
              <span>global</span>
            ),
          },
          {
            label: 'Active',
            value: p.modelVersion.isActive ? (
              <span className="text-emerald-700">yes</span>
            ) : (
              <span className="text-koi-mute">no (superseded)</span>
            ),
          },
          { label: 'Trained', value: `${formatDateTime(p.modelVersion.trainedAt)} (${formatRelative(p.modelVersion.trainedAt)})` },
          { label: 'Artifact', value: <code className="text-xs">{p.modelVersion.artifactPath}</code> },
          {
            label: 'Rows fit',
            value: String((p.modelVersion.metadata as Record<string, unknown>)?.rowsFit ?? '—'),
          },
        ]}
      />
    </div>
  );
}
