'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV: { href: string; label: string }[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/users', label: 'Users' },
  { href: '/ponds', label: 'Ponds' },
  { href: '/devices', label: 'Devices' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/predictions', label: 'AI / Predictions' },
];

export function SidebarNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-2">
      {NAV.map((item) => {
        const active = item.href === '/' ? path === '/' : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-koi-red/10 text-koi-red font-medium'
                : 'text-koi-ink hover:bg-koi-line/50',
            ].join(' ')}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
