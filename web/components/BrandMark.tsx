import Link from 'next/link';
import {
  GleanLogo,
  GleanWordmark,
  type GleanWordmarkSize,
} from '@/components/logo/GleanLogo';

export function BrandMark({
  suffix,
  tagline,
  size = 'md',
  href = '/',
  showIcon = true,
  className = '',
}: {
  suffix?: string;
  tagline?: string;
  size?: GleanWordmarkSize;
  href?: string | null;
  showIcon?: boolean;
  className?: string;
}) {
  const iconSize =
    size === 'xl'
      ? 'h-8 w-8'
      : size === 'lg'
        ? 'h-7 w-7'
        : size === 'sm'
          ? 'h-5 w-5'
          : 'h-6 w-6';

  const inner = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {showIcon ? (
        <div className={`shrink-0 ${iconSize}`} aria-hidden>
          <GleanLogo />
        </div>
      ) : null}
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
