import { adminFetch } from '@/lib/admin-fetch';
import { StatCard } from '@/components/stat-card';
import { ListError } from '@/components/list-error';
import { DataTable } from '@/components/data-table';
import { formatBytes, formatNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface SystemStats {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSec: number;
  processUptimeSec: number;
  cpu: {
    model: string;
    cores: number;
    loadavg1: number;
    loadavg5: number;
    loadavg15: number;
    loadPercent: number;
  };
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usedPercent: number;
  };
  disk: {
    path: string;
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usedPercent: number;
  };
  gpus: GpuRow[];
  gpuQueryError: string | null;
}

interface GpuRow {
  index: number;
  name: string;
  memoryTotalMb: number;
  memoryUsedMb: number;
  utilizationGpuPercent: number;
  utilizationMemPercent: number;
  temperatureC: number | null;
}

function formatUptime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '—';
  const d = Math.floor(sec / 86_400);
  const h = Math.floor((sec % 86_400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function pctAccent(pct: number): 'default' | 'warn' | 'critical' {
  if (pct >= 0.9) return 'critical';
  if (pct >= 0.75) return 'warn';
  return 'default';
}

export default async function ServerPage() {
  const stats = await adminFetch<SystemStats>('/system');
  if ('error' in stats) return <ListError title="Server" error={stats.error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-koi-ink">Server</h1>
        <p className="mt-1 text-sm text-koi-mute">
          {stats.hostname} · {stats.platform}/{stats.arch} · node {stats.nodeVersion}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="CPU load (1m)"
          value={`${(stats.cpu.loadPercent * 100).toFixed(1)}%`}
          hint={`loadavg ${stats.cpu.loadavg1} / ${stats.cpu.loadavg5} / ${stats.cpu.loadavg15} · ${stats.cpu.cores} cores`}
          accent={pctAccent(stats.cpu.loadPercent)}
        />
        <StatCard
          label="Memory used"
          value={`${(stats.memory.usedPercent * 100).toFixed(1)}%`}
          hint={`${formatBytes(stats.memory.usedBytes)} of ${formatBytes(stats.memory.totalBytes)}`}
          accent={pctAccent(stats.memory.usedPercent)}
        />
        <StatCard
          label="Disk used"
          value={`${(stats.disk.usedPercent * 100).toFixed(1)}%`}
          hint={`${formatBytes(stats.disk.usedBytes)} of ${formatBytes(stats.disk.totalBytes)} · ${stats.disk.path}`}
          accent={pctAccent(stats.disk.usedPercent)}
        />
        <StatCard
          label="Uptime"
          value={formatUptime(stats.processUptimeSec)}
          hint={`host up ${formatUptime(stats.uptimeSec)}`}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-koi-ink">CPU</h2>
        <div className="rounded-md border border-koi-line bg-white p-4 text-sm">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            <DefRow label="Model" value={stats.cpu.model} />
            <DefRow label="Cores" value={String(stats.cpu.cores)} />
            <DefRow label="Load (1m)" value={String(stats.cpu.loadavg1)} />
            <DefRow label="Load (5m)" value={String(stats.cpu.loadavg5)} />
            <DefRow label="Load (15m)" value={String(stats.cpu.loadavg15)} />
          </dl>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-koi-ink">Memory</h2>
        <div className="rounded-md border border-koi-line bg-white p-4 text-sm">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            <DefRow label="Total" value={formatBytes(stats.memory.totalBytes)} />
            <DefRow label="Used" value={formatBytes(stats.memory.usedBytes)} />
            <DefRow label="Free" value={formatBytes(stats.memory.freeBytes)} />
            <DefRow label="Used %" value={`${(stats.memory.usedPercent * 100).toFixed(1)}%`} />
          </dl>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-koi-ink">Storage</h2>
        <div className="rounded-md border border-koi-line bg-white p-4 text-sm">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            <DefRow label="Mount" value={stats.disk.path} />
            <DefRow label="Total" value={formatBytes(stats.disk.totalBytes)} />
            <DefRow label="Used" value={formatBytes(stats.disk.usedBytes)} />
            <DefRow label="Free" value={formatBytes(stats.disk.freeBytes)} />
          </dl>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-koi-ink">GPUs</h2>
        {stats.gpus.length === 0 ? (
          <div className="rounded-md border border-koi-line bg-white p-6 text-sm text-koi-mute">
            No GPUs detected.{' '}
            {stats.gpuQueryError ? (
              <span className="text-xs">({stats.gpuQueryError})</span>
            ) : null}
          </div>
        ) : (
          <DataTable<GpuRow>
            rows={stats.gpus}
            columns={[
              { header: '#', cell: (g) => <span className="text-xs">{g.index}</span> },
              { header: 'Model', cell: (g) => <span>{g.name}</span> },
              {
                header: 'GPU util',
                cell: (g) => <span>{g.utilizationGpuPercent}%</span>,
              },
              {
                header: 'Mem util',
                cell: (g) => <span>{g.utilizationMemPercent}%</span>,
              },
              {
                header: 'VRAM',
                cell: (g) => (
                  <span>
                    {formatNumber(g.memoryUsedMb)} / {formatNumber(g.memoryTotalMb)} MB
                  </span>
                ),
              },
              {
                header: 'Temp',
                cell: (g) => <span>{g.temperatureC === null ? '—' : `${g.temperatureC} °C`}</span>,
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}

function DefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-koi-line/50 pb-1 last:border-0 last:pb-0">
      <dt className="text-koi-mute">{label}</dt>
      <dd className="text-right tabular-nums text-koi-ink">{value}</dd>
    </div>
  );
}
