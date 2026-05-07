'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const KOI_INK = '#181818';
const KOI_RED = '#d63a2f';
const KOI_LINE = '#e5e3dc';
const KOI_MUTE = '#7a7770';

const SHARED_AXIS = {
  stroke: KOI_MUTE,
  fontSize: 11,
};

function shortDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function shortHour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ChartFrameProps {
  title: string;
  hint?: string;
  height?: number;
  empty?: boolean;
  children: React.ReactNode;
}

function ChartFrame({ title, hint, height = 220, empty, children }: ChartFrameProps) {
  return (
    <div className="rounded-lg border border-koi-line bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-koi-ink">{title}</h3>
        {hint ? <span className="text-xs text-koi-mute">{hint}</span> : null}
      </div>
      {empty ? (
        <div
          className="flex items-center justify-center text-xs text-koi-mute"
          style={{ height }}
        >
          No data in this window.
        </div>
      ) : (
        <div style={{ width: '100%', height }}>{children}</div>
      )}
    </div>
  );
}

// ---------- Dashboard charts ----------

interface TelemetryPoint {
  day: string;
  count: number;
}

export function TelemetryChart({ data }: { data: TelemetryPoint[] }) {
  return (
    <ChartFrame
      title="Telemetry rows / day"
      hint="last 30 days"
      empty={data.length === 0}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={KOI_LINE} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tickFormatter={shortDay} {...SHARED_AXIS} />
          <YAxis allowDecimals={false} {...SHARED_AXIS} />
          <Tooltip
            cursor={{ fill: KOI_LINE, fillOpacity: 0.4 }}
            labelFormatter={(v) => shortDay(String(v))}
          />
          <Bar dataKey="count" fill={KOI_INK} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

interface AlertPoint {
  day: string;
  INFO: number;
  WARNING: number;
  CRITICAL: number;
}

export function AlertsChart({ data }: { data: AlertPoint[] }) {
  return (
    <ChartFrame
      title="Alerts fired / day"
      hint="last 30 days, stacked by severity"
      empty={data.length === 0}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={KOI_LINE} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tickFormatter={shortDay} {...SHARED_AXIS} />
          <YAxis allowDecimals={false} {...SHARED_AXIS} />
          <Tooltip labelFormatter={(v) => shortDay(String(v))} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar stackId="s" dataKey="INFO" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
          <Bar stackId="s" dataKey="WARNING" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar stackId="s" dataKey="CRITICAL" fill={KOI_RED} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

interface PredictionPoint {
  day: string;
  total: number;
  flagged: number;
}

export function PredictionsChart({ data }: { data: PredictionPoint[] }) {
  return (
    <ChartFrame
      title="Predictions / day"
      hint="last 30 days, total and flagged"
      empty={data.length === 0}
    >
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={KOI_LINE} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tickFormatter={shortDay} {...SHARED_AXIS} />
          <YAxis allowDecimals={false} {...SHARED_AXIS} />
          <Tooltip labelFormatter={(v) => shortDay(String(v))} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="total"
            stroke={KOI_INK}
            strokeWidth={2}
            dot={{ r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="flagged"
            stroke={KOI_RED}
            strokeWidth={2}
            dot={{ r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// ---------- Pond detail chart ----------

interface PondTelemetryPoint {
  time: string;
  value: number | null;
}

interface PondTelemetryProps {
  metric: string;
  data: PondTelemetryPoint[];
  unit?: string;
}

export function PondTelemetryChart({ metric, data, unit }: PondTelemetryProps) {
  return (
    <ChartFrame
      title={`${metric} trend`}
      hint="last 24h, 15-minute averages"
      empty={data.length === 0}
    >
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
          <CartesianGrid stroke={KOI_LINE} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" tickFormatter={shortHour} {...SHARED_AXIS} />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(v) => (typeof v === 'number' ? v.toFixed(2) : String(v))}
            {...SHARED_AXIS}
          />
          <Tooltip
            labelFormatter={(v) => shortHour(String(v))}
            formatter={(v) =>
              typeof v === 'number' ? `${v.toFixed(3)}${unit ? ` ${unit}` : ''}` : v
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            name={metric}
            stroke={KOI_RED}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
