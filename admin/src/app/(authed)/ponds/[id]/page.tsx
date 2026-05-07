import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
import { ListError } from '@/components/list-error';
import { DetailCard, Section } from '@/components/detail-card';
import { DataTable } from '@/components/data-table';
import { formatDateTime, formatRelative } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Severity = 'INFO' | 'WARNING' | 'CRITICAL';
type Op = 'LT' | 'LTE' | 'GT' | 'GTE' | 'EQ' | 'NEQ';

interface PondDetail {
  id: string;
  name: string;
  volumeM3: number;
  koiCount: number;
  latitude: number;
  longitude: number;
  timezone: string;
  createdAt: string;
  members: { role: string; user: { id: string; email: string; displayName: string | null } }[];
  devices: {
    id: string;
    hardwareId: string;
    label: string | null;
    firmwareVer: string | null;
    lastSeenAt: string | null;
    _count: { certificates: number };
  }[];
  alertRules: {
    id: string;
    metric: string;
    op: Op;
    threshold: number;
    severity: Severity;
    enabled: boolean;
  }[];
  alertEvents: {
    id: string;
    metric: string;
    value: number;
    severity: Severity;
    firedAt: string;
    resolvedAt: string | null;
  }[];
  telemetryCount24h: number;
  latestTelemetry: { time: string; source: string; phVal: number | null; tempC: number | null; doMgL: number | null; nh3FreePpm: number | null } | null;
  activeAnomalyModel: { id: string; version: string; trainedAt: string; metadata: Record<string, unknown> } | null;
}

const sevClass: Record<Severity, string> = {
  INFO: 'bg-sky-100 text-sky-800',
  WARNING: 'bg-amber-100 text-amber-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

export default async function PondDetailPage({ params }: { params: { id: string } }) {
  const p = await adminFetch<PondDetail>(`/ponds/${params.id}`);
  if ('error' in p) return <ListError title="Pond" error={p.error} />;

  const stocking = p.koiCount / Math.max(p.volumeM3, 0.01);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/ponds" className="text-xs text-koi-mute hover:text-koi-red">← Ponds</Link>
        <h1 className="mt-1 text-2xl font-semibold text-koi-ink">{p.name}</h1>
      </div>

      <DetailCard
        title="Pond"
        rows={[
          { label: 'ID', value: <code className="text-xs">{p.id}</code> },
          { label: 'Volume', value: `${p.volumeM3.toFixed(1)} m³` },
          { label: 'Koi count', value: p.koiCount },
          { label: 'Stocking density', value: `${stocking.toFixed(2)} fish/m³` },
          { label: 'Location', value: `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)} (${p.timezone})` },
          { label: 'Created', value: formatDateTime(p.createdAt) },
          { label: 'Telemetry rows (24h)', value: p.telemetryCount24h },
          {
            label: 'Latest reading',
            value: p.latestTelemetry ? (
              <span title={formatDateTime(p.latestTelemetry.time)}>
                {formatRelative(p.latestTelemetry.time)} ({p.latestTelemetry.source})
              </span>
            ) : (
              <span className="text-koi-mute">none yet</span>
            ),
          },
        ]}
      />

      <Section title={`Members (${p.members.length})`}>
        <DataTable
          rows={p.members}
          columns={[
            {
              header: 'User',
              cell: (m) => (
                <Link href={`/users/${m.user.id}`} className="text-koi-ink hover:text-koi-red hover:underline">
                  {m.user.email}
                </Link>
              ),
            },
            { header: 'Role', cell: (m) => <code className="text-xs">{m.role}</code> },
          ]}
          empty="No members."
        />
      </Section>

      <Section title={`Devices (${p.devices.length})`}>
        <DataTable
          rows={p.devices}
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
            { header: 'Firmware', cell: (d) => d.firmwareVer ?? <span className="text-koi-mute">—</span> },
            { header: 'Certs', cell: (d) => d._count.certificates, className: 'tabular-nums' },
            {
              header: 'Last seen',
              cell: (d) =>
                d.lastSeenAt ? formatRelative(d.lastSeenAt) : <span className="text-koi-mute">never</span>,
            },
          ]}
          empty="No devices."
        />
      </Section>

      <Section title={`Alert rules (${p.alertRules.length})`} hint="Threshold rules evaluated on every telemetry insert.">
        <DataTable
          rows={p.alertRules}
          columns={[
            { header: 'Metric', cell: (r) => <code className="text-xs">{r.metric}</code> },
            { header: 'Op', cell: (r) => <code className="text-xs">{r.op}</code> },
            { header: 'Threshold', cell: (r) => r.threshold, className: 'tabular-nums' },
            {
              header: 'Severity',
              cell: (r) => (
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${sevClass[r.severity]}`}>
                  {r.severity}
                </span>
              ),
            },
            {
              header: 'Enabled',
              cell: (r) =>
                r.enabled ? (
                  <span className="text-emerald-700">yes</span>
                ) : (
                  <span className="text-koi-mute">no</span>
                ),
            },
          ]}
          empty="No alert rules configured for this pond yet."
        />
      </Section>

      <Section title="Recent alerts" hint={`${p.alertEvents.length} most recent`}>
        <DataTable
          rows={p.alertEvents}
          columns={[
            {
              header: 'Severity',
              cell: (a) => (
                <Link href={`/alerts/${a.id}`} className="hover:underline">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${sevClass[a.severity]}`}>
                    {a.severity}
                  </span>
                </Link>
              ),
            },
            { header: 'Metric', cell: (a) => <code className="text-xs">{a.metric}</code> },
            { header: 'Value', cell: (a) => a.value.toFixed(3), className: 'tabular-nums' },
            {
              header: 'Status',
              cell: (a) => (a.resolvedAt ? <span className="text-koi-mute">resolved</span> : <span className="text-koi-red font-medium">open</span>),
            },
            { header: 'Fired', cell: (a) => formatRelative(a.firedAt) },
          ]}
          empty="No alerts have fired for this pond."
        />
      </Section>

      <Section title="AI model" hint="Active per-pond anomaly detector">
        {p.activeAnomalyModel ? (
          <DetailCard
            rows={[
              { label: 'Version', value: <code className="text-xs">{p.activeAnomalyModel.version}</code> },
              { label: 'Trained', value: `${formatDateTime(p.activeAnomalyModel.trainedAt)} (${formatRelative(p.activeAnomalyModel.trainedAt)})` },
              {
                label: 'Rows fit',
                value: String((p.activeAnomalyModel.metadata as Record<string, unknown>)?.rowsFit ?? '—'),
              },
              {
                label: 'Algorithm',
                value: <code className="text-xs">{String((p.activeAnomalyModel.metadata as Record<string, unknown>)?.algorithm ?? '—')}</code>,
              },
            ]}
          />
        ) : (
          <div className="rounded-md border border-koi-line bg-white p-5 text-sm text-koi-mute">
            No active anomaly model for this pond yet — trigger one with{' '}
            <code className="rounded bg-koi-line/40 px-1">POST /retrain/anomaly</code> on the ML sidecar.
          </div>
        )}
      </Section>
    </div>
  );
}
