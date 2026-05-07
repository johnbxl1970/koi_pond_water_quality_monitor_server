import Link from 'next/link';
import React from 'react';

interface Props {
  /** GET path the form posts to (the same list page). */
  action: string;
  /** Current search-param values, used to reset the form on Clear and to
   *  prepopulate inputs by the page itself (passed to children). */
  current: Record<string, string | undefined>;
  children: React.ReactNode;
}

/**
 * Wrapper that renders a Tailwind-styled GET form. Filters are
 * URL-driven — submitting the form reloads the page with the new
 * query string, which Server Components consume to refetch.
 *
 * The reset link strips every query param and goes back to the bare
 * list URL so users can quickly clear all filters in one click.
 */
export function FilterBar({ action, current, children }: Props) {
  const hasAny = Object.values(current).some((v) => v !== undefined && v !== '');
  return (
    <form
      action={action}
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-md border border-koi-line bg-white p-3"
    >
      {children}
      <div className="ml-auto flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-koi-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-koi-red transition-colors"
        >
          Apply
        </button>
        {hasAny ? (
          <Link
            href={action}
            className="rounded-md border border-koi-line bg-white px-3 py-1.5 text-xs text-koi-mute hover:text-koi-red"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="uppercase tracking-wider text-koi-mute">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'rounded-md border border-koi-line bg-white px-2 py-1.5 text-sm text-koi-ink focus:border-koi-red focus:outline-none';

export function TextField({
  name, defaultValue, placeholder,
}: { name: string; defaultValue?: string; placeholder?: string }) {
  return (
    <input
      type="text"
      name={name}
      defaultValue={defaultValue ?? ''}
      placeholder={placeholder}
      className={`${inputCls} w-56`}
    />
  );
}

interface SelectOption {
  label: string;
  value: string;
}

export function SelectField({
  name, defaultValue, options,
}: { name: string; defaultValue?: string; options: SelectOption[] }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ''} className={inputCls}>
      <option value="">any</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
