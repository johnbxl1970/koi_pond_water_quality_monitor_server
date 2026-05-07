import React from 'react';

interface KV {
  label: string;
  value: React.ReactNode;
}

interface Props {
  title?: string;
  rows: KV[];
}

/** Definition-list card for a record's primary fields. Used by every
 *  detail page so the "header section" stays consistent. */
export function DetailCard({ title, rows }: Props) {
  return (
    <div className="rounded-lg border border-koi-line bg-white">
      {title ? (
        <div className="border-b border-koi-line px-5 py-3 text-xs font-semibold uppercase tracking-wider text-koi-mute">
          {title}
        </div>
      ) : null}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-5 sm:grid-cols-2">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <dt className="text-xs uppercase tracking-wider text-koi-mute">{r.label}</dt>
            <dd className="text-sm text-koi-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface SectionProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
}

export function Section({ title, hint, children }: SectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-koi-mute">{title}</h2>
        {hint ? <span className="text-xs text-koi-mute">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}
