import React from 'react';

interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
}

/** Plain-Tailwind table primitive used by every admin list. Intentionally
 *  minimal — no sorting, no row-click, no virtualization. The lists at this
 *  scale (hundreds of rows max with pagination) don't need any of that. */
export function DataTable<T>({ columns, rows, empty = 'No rows.' }: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-koi-line bg-white p-8 text-center text-sm text-koi-mute">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border border-koi-line bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-koi-line/40">
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                className={`px-4 py-2 text-left font-medium text-koi-mute ${c.className ?? ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-koi-line">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-koi-line/20">
              {columns.map((c, j) => (
                <td key={j} className={`px-4 py-2 text-koi-ink ${c.className ?? ''}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
