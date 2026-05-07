import type { Metadata } from 'next';
import './globals.css';
import { BrandMark } from '@/components/brand-mark';
import { SidebarNav } from '@/components/sidebar-nav';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${BRAND.name} Admin`,
  description: `${BRAND.slogan} — admin portal for the koi pond water quality monitor system.`,
  icons: {
    icon: [
      { url: '/icon.png', sizes: '64x64', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-koi-line bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <BrandMark />
            <span className="text-xs text-koi-mute">Internal admin portal</span>
          </div>
        </header>
        <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
          <aside className="w-56 shrink-0 rounded-lg border border-koi-line bg-white">
            <SidebarNav />
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
