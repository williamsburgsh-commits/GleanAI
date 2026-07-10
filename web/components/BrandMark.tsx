import Link from 'next/link';
import { GleanWordmark, type GleanWordmarkSize } from '@/components/logo/GleanLogo';

export function BrandMark({
  suffix,
  tagline,
  size = 'md',
  href = '/',
  className = '',
}: {
  suffix?: string;
  tagline?: string;
  size?: GleanWordmarkSize;
  href?: string | null;
  className?: string;
}) {
  const inner = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex min-w-0 items-center gap-2">
        <GleanWordmark size={size} glow />
        {suffix ? (
          <span className="font-pixel text-[10px] text-ash sm:text-[11px]">{suffix}</span>
        ) : null}
        {tagline ? (
          <span className="hidden font-term text-[16px] uppercase tracking-[0.2em] text-ash sm:inline">
            {tagline}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90">
        {inner}
      </Link>
    );
  }

  return inner;
}
