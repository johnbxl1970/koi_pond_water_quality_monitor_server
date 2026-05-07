import Image from 'next/image';
import Link from 'next/link';
import { BRAND } from '@/lib/brand';

/** Logo + slogan, used in the top-of-page header. Click target → dashboard. */
export function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <Image
        src={BRAND.logo}
        alt={`${BRAND.name} koi logo`}
        width={48}
        height={48}
        priority
        className="rounded-md"
      />
      <span className="flex flex-col leading-tight">
        <span className="text-xl font-semibold tracking-tight text-koi-ink">
          {BRAND.name}
        </span>
        <span className="text-xs uppercase tracking-[0.18em] text-koi-mute group-hover:text-koi-red transition-colors">
          {BRAND.slogan}
        </span>
      </span>
    </Link>
  );
}
