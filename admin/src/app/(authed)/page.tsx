import { StatCard } from '@/components/stat-card';
import { getDashboardStats } from '@/lib/server-stats';
import {
  getAlertSeries,
  getPredictionSeries,
  getTelemetrySeries,
} from '@/lib/timeseries';
import { AlertsChart, PredictionsChart, TelemetryChart } from '@/components/charts';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [s, telemetrySeries, alertSeries, predictionSeries] = await Promise.all([
    getDashboardStats(),
    getTelemetrySeries('30d'),
    getAlertSeries('30d'),
    getPredictionSeries('30d'),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-koi-ink">Dashboard</h1>
          <p className="text-sm text-koi-mute">
            Live state across users, ponds, devices, and the prediction pipeline.
          </p>
        </div>
      </div>

      {!s.live ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">Not yet wired:</strong>{' '}
          stats below are placeholder zeros. The next step is the NestJS{' '}
          <code className="rounded bg-amber-100 px-1">/api/admin/stats</code>{' '}
          endpoint and the matching auth flow — see{' '}
          <code className="rounded bg-amber-100 px-1">src/lib/server-stats.ts</code>.
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-koi-mute">
          People &amp; ponds
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Users" value={s.users.total} hint={`${s.users.last7d} new this week`} />
          <StatCard label="Ponds" value={s.ponds.total} hint={`${s.ponds.withTelemetry24h} active 24h`} />
          <StatCard label="Devices" value={s.devices.total} hint={`${s.devices.activeCerts} active certs`} />
          <StatCard label="Pending claims" value={s.devices.pendingClaims} accent={s.devices.pendingClaims > 0 ? 'warn' : 'default'} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-koi-mute">
          Alerts
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open alerts" value={s.alerts.open} accent={s.alerts.open > 0 ? 'warn' : 'default'} />
          <StatCard label="Critical (24h)" value={s.alerts.critical24h} accent={s.alerts.critical24h > 0 ? 'critical' : 'default'} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-koi-mute">
          AI &amp; predictions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active anomaly models" value={s.ai.activeAnomalyModels} hint="one per pond" />
          <StatCard label="Predictions (24h)" value={s.ai.predictionEvents24h} />
          <StatCard
            label="Flagged rate (24h)"
            value={`${(s.ai.flaggedRate24h * 100).toFixed(1)}%`}
            accent={s.ai.flaggedRate24h > 0.1 ? 'warn' : 'default'}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-koi-mute">
          System
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Telemetry rows (24h)" value={s.system.telemetryRowsLast24h} />
          <StatCard
            label="Last weather poll"
            value={
              s.system.lastWeatherPollMinutesAgo === null
                ? '—'
                : `${s.system.lastWeatherPollMinutesAgo}m ago`
            }
            accent={
              s.system.lastWeatherPollMinutesAgo !== null && s.system.lastWeatherPollMinutesAgo > 90
                ? 'warn'
                : 'default'
            }
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-koi-mute">
          Trends
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TelemetryChart data={telemetrySeries} />
          <AlertsChart data={alertSeries} />
          <PredictionsChart data={predictionSeries} />
        </div>
      </section>
    </div>
  );
}
