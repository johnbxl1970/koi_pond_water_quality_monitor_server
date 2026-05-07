import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
import { ListError } from '@/components/list-error';
import { DetailCard } from '@/components/detail-card';
import { formatDateTime, formatRelative } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Severity = 'INFO' | 'WARNING' | 'CRITICAL';
type Op = 'LT' | 'LTE' | 'GT' | 'GTE' | 'EQ' | 'NEQ';

interface AlertDetail {
  id: string;
  pondId: string;
  metric: string;
  value: number;
  severity: Severity;
  firedAt: string;
  resolvedAt: string | null;
  pond: { id: string; name: string } | null;
  rule: {
    id: string;
    metric: string;
    op: Op;
    threshold: number;
    severity: Severity;
    enabled: boolean;
  };
}

const sevClass: Record<Severity, string> = {
  INFO: 'bg-sky-100 text-sky-800',
  WARNING: 'bg-amber-100 text-amber-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const opGlyph: Record<Op, string> = {
  LT: '<', LTE: '≤', GT: '>', GTE: '≥', EQ: '=', NEQ: '≠',
};

export default async function AlertDetailPage({ params }: { params: { id: string } }) {
  const a = await adminFetch<AlertDetail>(`/alerts/${params.id}`);
  if ('error' in a) return <ListError title="Alert" error={a.error} />;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/alerts" className="text-xs text-koi-mute hover:text-koi-red">← Alerts</Link>
        <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold text-koi-ink">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${sevClass[a.severity]}`}>
            {a.severity}
          </span>
          <code className="text-base">{a.metric}</code>
        </h1>
      </div>

      <DetailCard
        title="Event"
        rows={[
          { label: 'ID', value: <code className="text-xs">{a.id}</code> },
          {
            label: 'Pond',
            value: a.pond ? (
              <Link href={`/ponds/${a.pond.id}`} className="text-koi-ink hover:text-koi-red hover:underline">
                {a.pond.name}
              </Link>
            ) : (
              <span className="text-koi-mute">{a.pondId}</span>
            ),
          },
          { label: 'Metric', value: <code className="text-xs">{a.metric}</code> },
          { label: 'Value', value: a.value.toFixed(3) },
          { label: 'Fired', value: `${formatDateTime(a.firedAt)} (${formatRelative(a.firedAt)})` },
          {
            label: 'Status',
            value: a.resolvedAt ? (
              <span>
                resolved at {formatDateTime(a.resolvedAt)}
              </span>
            ) : (
              <span className="font-medium text-koi-red">open</span>
            ),
          },
        ]}
      />

      <DetailCard
        title="Triggering rule"
        rows={[
          { label: 'Rule ID', value: <code className="text-xs">{a.rule.id}</code> },
          {
            label: 'Threshold',
            value: (
              <span>
                <code className="text-xs">{a.rule.metric}</code> {opGlyph[a.rule.op]} {a.rule.threshold}
              </span>
            ),
          },
          {
            label: 'Default severity',
            value: (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${sevClass[a.rule.severity]}`}>
                {a.rule.severity}
              </span>
            ),
          },
          {
            label: 'Enabled',
            value: a.rule.enabled ? (
              <span className="text-emerald-700">yes</span>
            ) : (
              <span className="text-koi-mute">no</span>
            ),
          },
        ]}
      />
    </div>
  );
}
