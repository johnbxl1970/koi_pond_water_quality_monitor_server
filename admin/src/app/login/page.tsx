import Image from 'next/image';
import { LoginForm } from './login-form';
import { BRAND } from '@/lib/brand';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-koi-line bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Image src={BRAND.logo} alt="" width={48} height={48} className="rounded-md" />
          <div>
            <div className="text-lg font-semibold tracking-tight text-koi-ink">
              {BRAND.name} Admin
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-koi-mute">
              {BRAND.slogan}
            </div>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
