interface Props {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'default' | 'warn' | 'critical';
}

export function StatCard({ label, value, hint, accent = 'default' }: Props) {
  const accentClass =
    accent === 'critical'
      ? 'text-koi-red'
      : accent === 'warn'
        ? 'text-amber-600'
        : 'text-koi-ink';
  return (
    <div className="rounded-lg border border-koi-line bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-koi-mute">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${accentClass}`}>
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-koi-mute">{hint}</div>
      ) : null}
    </div>
  );
}
