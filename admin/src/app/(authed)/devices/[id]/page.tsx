import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
import { ListError } from '@/components/list-error';
import { DetailCard, Section } from '@/components/detail-card';
import { DataTable } from '@/components/data-table';
import { formatDateTime, formatRelative } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface DeviceDetail {
  id: string;
  hardwareId: string;
  label: string | null;
  firmwareVer: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  pondId: string;
  pond: { id: string; name: string } | null;
  certificates: {
    id: string;
    serial: string;
    status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
    issuedAt: string;
    expiresAt: string;
    revokedAt: string | null;
  }[];
  recentTelemetry: {
    time: string;
    source: string;
    phVal: number | null;
    tempC: number | null;
    doMgL: number | null;
    nh3FreePpm: number | null;
  }[];
}

const certStatusClass: Record<DeviceDetail['certificates'][number]['status'], string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  REVOKED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-koi-line/60 text-koi-mute',
};

export default async function DeviceDetailPage({ params }: { params: { id: string } }) {
  const d = await adminFetch<DeviceDetail>(`/devices/${params.id}`);
  if ('error' in d) return <ListError title="Device" error={d.error} />;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/devices" className="text-xs text-koi-mute hover:text-koi-red">← Devices</Link>
        <h1 className="mt-1 text-2xl font-semibold text-koi-ink">
          {d.label ?? d.hardwareId}
        </h1>
      </div>

      <DetailCard
        title="Device"
        rows={[
          { label: 'Hardware ID', value: <code className="text-xs">{d.hardwareId}</code> },
          { label: 'Internal ID', value: <code className="text-xs">{d.id}</code> },
          {
            label: 'Pond',
            value: d.pond ? (
              <Link href={`/ponds/${d.pond.id}`} className="text-koi-ink hover:text-koi-red hover:underline">
                {d.pond.name}
              </Link>
            ) : (
              <span className="text-koi-mute">{d.pondId}</span>
            ),
          },
          { label: 'Firmware', value: d.firmwareVer ?? <span className="text-koi-mute">—</span> },
          {
            label: 'Last seen',
            value: d.lastSeenAt ? (
              <span title={formatDateTime(d.lastSeenAt)}>{formatRelative(d.lastSeenAt)}</span>
            ) : (
              <span className="text-koi-mute">never</span>
            ),
          },
          { label: 'Registered', value: formatDateTime(d.createdAt) },
        ]}
      />

      <Section title={`Certificates (${d.certificates.length})`} hint="Most recent 10">
        <DataTable
          rows={d.certificates}
          columns={[
            { header: 'Serial', cell: (c) => <code className="text-xs">{c.serial}</code> },
            {
              header: 'Status',
              cell: (c) => (
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${certStatusClass[c.status]}`}>
                  {c.status}
                </span>
              ),
            },
            { header: 'Issued', cell: (c) => formatDateTime(c.issuedAt) },
            { header: 'Expires', cell: (c) => formatDateTime(c.expiresAt) },
            {
              header: 'Revoked',
              cell: (c) =>
                c.revokedAt ? formatDateTime(c.revokedAt) : <span className="text-koi-mute">—</span>,
            },
          ]}
          empty="No certificates issued. Device is in the bootstrap state until it claims one."
        />
      </Section>

      <Section title="Recent telemetry" hint={`${d.recentTelemetry.length} most recent`}>
        <DataTable
          rows={d.recentTelemetry}
          columns={[
            { header: 'Time', cell: (t) => <span title={formatDateTime(t.time)}>{formatRelative(t.time)}</span> },
            { header: 'Source', cell: (t) => <code className="text-xs">{t.source}</code> },
            { header: 'pH', cell: (t) => (t.phVal ?? '—').toString(), className: 'tabular-nums' },
            { header: 'Temp °C', cell: (t) => (t.tempC ?? '—').toString(), className: 'tabular-nums' },
            { header: 'DO mg/L', cell: (t) => (t.doMgL ?? '—').toString(), className: 'tabular-nums' },
            {
              header: 'Free NH3',
              cell: (t) => (t.nh3FreePpm == null ? '—' : t.nh3FreePpm.toFixed(3)),
              className: 'tabular-nums',
            },
          ]}
          empty="No telemetry from this device yet."
        />
      </Section>
    </div>
  );
}
