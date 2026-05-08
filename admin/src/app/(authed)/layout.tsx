import { BrandMark } from '@/components/brand-mark';
import { SidebarNav } from '@/components/sidebar-nav';
import { HeaderUser } from '@/components/header-user';
import { VersionFooter } from '@/components/version-footer';

/** Layout for everything behind the admin login. The middleware bounces
 *  unauthed requests to /login before they ever reach this. */
export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-koi-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <BrandMark />
          <HeaderUser />
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        <aside className="flex w-56 shrink-0 flex-col rounded-lg border border-koi-line bg-white">
          <div className="flex-1">
            <SidebarNav />
          </div>
          <VersionFooter />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </>
  );
}
