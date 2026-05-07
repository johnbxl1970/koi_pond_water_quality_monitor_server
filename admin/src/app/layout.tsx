import type { Metadata } from 'next';
import './globals.css';
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
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
