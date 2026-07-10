import type { CSSProperties } from 'react';
import {
  LOGO_COLORS as C,
  PixelGrid,
  fillRect,
  outlineRect,
  px,
} from '@/components/logo/pixelGrid';

export type GleanLogoVariant = 'coin-slot' | 'crt' | 'wallet-bolt' | 'receipt';

export interface GleanLogoProps {
  variant?: GleanLogoVariant;
  /** Blinking terminal cursor (CRT variant only). */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/** GleanAI logo mark — default #1 Coin Slot. */
export function GleanLogo({
  variant = 'coin-slot',
  animated = false,
  className = '',
  style,
  title = 'GleanAI',
}: GleanLogoProps) {
  if (variant === 'wallet-bolt') {
    return <LogoWalletBolt className={className} style={style} title={title} />;
  }
  if (variant === 'receipt') {
    return <LogoReceiptG className={className} style={style} title={title} />;
  }
  if (variant === 'crt') {
    return (
      <LogoCrtG
        animated={animated}
        className={className}
        style={style}
        title={title}
      />
    );
  }
  return <LogoCoinSlot className={className} style={style} title={title} />;
}

function LogoCoinSlot({
  className,
  style,
  title,
}: {
  className: string;
  style?: CSSProperties;
  title: string;
}) {
  return (
    <PixelGrid w={32} h={32} className={className} style={style}>
      <title>{title}</title>
      {/* arcade cabinet */}
      {px(outlineRect(5, 3, 26, 23), C.grid)}
      {px(fillRect(7, 5, 18, 16), C.screen)}
      {/* coin slot recess */}
      {px(
        [
          [11, 8], [12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8], [20, 8],
          [11, 9], [20, 9],
          [11, 10], [20, 10],
          [11, 11], [20, 11],
          [11, 12], [20, 12],
          [11, 13], [20, 13],
        ],
        C.void,
      )}
      {/* phosphor coin dropping in */}
      {px(
        [
          [13, 5], [14, 5], [15, 5], [16, 5], [17, 5], [18, 5],
          [12, 6], [19, 6],
          [12, 7], [19, 7],
          [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8],
        ],
        C.phosphor,
      )}
      {/* coin highlight */}
      {px([[14, 6], [15, 6]], C.bone)}
      {/* cyan insert label */}
      {px(fillRect(12, 15, 8, 1), C.cyan)}
      {/* wallet peek below slot */}
      {px(
        [
          [13, 17], [14, 17], [15, 17], [16, 17], [17, 17], [18, 17],
          [12, 18], [19, 18],
          [12, 19], [19, 19],
          [13, 20], [14, 20], [15, 20], [16, 20], [17, 20], [18, 20],
        ],
        C.amber,
      )}
      {/* magenta AI LED */}
      {px([[23, 6]], C.magenta)}
      {/* cabinet feet */}
      {px(
        [
          [8, 24], [9, 24], [10, 24],
          [21, 24], [22, 24], [23, 24],
        ],
        C.grid,
      )}
      {/* ground line */}
      {px(fillRect(6, 26, 20, 1), C.grid)}
    </PixelGrid>
  );
}

function LogoCrtG({
  animated,
  className,
  style,
  title,
}: {
  animated: boolean;
  className: string;
  style?: CSSProperties;
  title: string;
}) {
  return (
    <PixelGrid w={32} h={32} className={className} style={style}>
      <title>{title}</title>
      {/* cabinet housing */}
      {px(outlineRect(4, 4, 27, 24), C.grid)}
      {px(fillRect(6, 6, 20, 17), C.screen)}
      {/* stepped CRT corners */}
      {px(
        [
          [5, 5], [6, 5], [7, 5],
          [5, 6], [5, 7],
          [26, 5], [25, 5], [24, 5],
          [27, 6], [27, 7],
          [5, 22], [5, 21], [5, 20],
          [6, 23], [7, 23],
          [27, 22], [27, 21], [27, 20],
          [26, 23], [25, 23],
        ],
        C.grid,
      )}
      {/* scanlines */}
      {px(
        [8, 10, 12, 16, 20].flatMap((y) => fillRect(7, y, 19, 1)),
        C.scanline,
      )}
      {/* corner brackets */}
      {px(
        [
          [7, 7], [8, 7], [9, 7], [7, 8], [7, 9],
          [24, 7], [23, 7], [22, 7], [25, 8], [25, 9],
          [7, 20], [8, 20], [9, 20], [7, 19], [7, 18],
          [24, 20], [23, 20], [22, 20], [25, 19], [25, 18],
        ],
        C.cyan,
      )}
      {/* pixel G — centered, bolder */}
      {px(
        [
          [11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9],
          [11, 10], [18, 10],
          [11, 11], [13, 11], [14, 11], [15, 11], [18, 11],
          [11, 12], [13, 12], [18, 12],
          [11, 13], [12, 13], [13, 13], [14, 13], [15, 13], [16, 13], [17, 13], [18, 13],
          [11, 14], [18, 14],
          [11, 15], [18, 15],
          [11, 16], [12, 16], [13, 16], [14, 16], [15, 16], [16, 16], [17, 16], [18, 16],
        ],
        C.phosphor,
      )}
      {/* AI accent inside the G bowl */}
      {px([[14, 11], [15, 11], [14, 12], [15, 12]], C.magenta)}
      {/* terminal cursor */}
      <rect
        x={20}
        y={14}
        width={1}
        height={2}
        fill={C.phosphor}
        className={animated ? 'animate-blink' : undefined}
      />
      {/* power LED + label ticks */}
      {px([[24, 22], [25, 22]], C.phosphor)}
      {px([[8, 22], [9, 22], [10, 22]], C.amber)}
      {/* cabinet feet */}
      {px(
        [
          [8, 25], [9, 25], [10, 25],
          [22, 25], [23, 25], [24, 25],
        ],
        C.grid,
      )}
    </PixelGrid>
  );
}

function LogoWalletBolt({
  className,
  style,
  title,
}: {
  className: string;
  style?: CSSProperties;
  title: string;
}) {
  return (
    <PixelGrid w={32} h={32} className={className} style={style}>
      <title>{title}</title>
      {/* amber bolt — dominant diagonal */}
      {px(
        [
          [16, 3], [17, 3],
          [16, 4], [17, 4],
          [15, 5], [16, 5],
          [15, 6], [16, 6],
          [14, 7], [15, 7],
          [14, 8], [15, 8],
          [13, 9], [14, 9],
          [12, 10], [13, 10],
          [11, 11], [12, 11],
          [10, 12], [11, 12],
          [9, 13], [10, 13],
          [8, 14], [9, 14],
          [7, 15], [8, 15],
          [6, 16], [7, 16],
          [5, 17], [6, 17],
          [4, 18], [5, 18],
          [3, 19], [4, 19],
          [2, 20], [3, 20],
        ],
        C.amber,
      )}
      {/* bolt highlight edge */}
      {px([[17, 4], [16, 7], [13, 10], [10, 13], [7, 16], [4, 19]], C.bone)}
      {/* wallet body */}
      {px(outlineRect(9, 11, 24, 22), C.grid)}
      {px(fillRect(10, 12, 14, 9), C.screen)}
      {/* phosphor clasp */}
      {px(
        [
          [9, 11], [10, 11], [11, 11], [12, 11],
          [9, 12], [12, 12],
        ],
        C.phosphor,
      )}
      {/* coin slot */}
      {px([[14, 14], [15, 14], [16, 14], [17, 14], [18, 14]], C.void)}
      {px([[18, 15]], C.phosphor)}
      {/* card peeking out */}
      {px(
        [
          [20, 13], [21, 13], [22, 13],
          [20, 14], [22, 14],
          [20, 15], [21, 15], [22, 15],
        ],
        C.cyan,
      )}
      {/* AI spark cluster */}
      {px([[21, 8], [22, 8], [21, 9], [22, 10]], C.magenta)}
      {/* ground shadow */}
      {px(fillRect(8, 24, 18, 1), C.grid)}
    </PixelGrid>
  );
}

function LogoReceiptG({
  className,
  style,
  title,
}: {
  className: string;
  style?: CSSProperties;
  title: string;
}) {
  return (
    <PixelGrid w={32} h={32} className={className} style={style}>
      <title>{title}</title>
      {/* receipt paper — G silhouette */}
      {px(outlineRect(9, 5, 21, 19), C.bone)}
      {px(fillRect(10, 6, 10, 12), C.bone)}
      {/* inner void carving the G */}
      {px(
        [
          [13, 7], [14, 7], [15, 7], [16, 7], [17, 7], [18, 7],
          [18, 8], [18, 9], [18, 10], [18, 11], [18, 12], [18, 13], [18, 14],
          [14, 14], [15, 14], [16, 14], [17, 14],
        ],
        C.void,
      )}
      {/* receipt header rule */}
      {px(fillRect(11, 8, 8, 1), C.receiptInk)}
      {/* printed lines */}
      {px(
        [
          [12, 10], [13, 10], [14, 10], [15, 10], [16, 10],
          [12, 11], [14, 11], [16, 11], [17, 11],
          [12, 12], [13, 12], [14, 12],
          [13, 16], [14, 16], [15, 16], [16, 16],
        ],
        C.receiptInk,
      )}
      {/* GLEAN stamp */}
      {px([[13, 17], [14, 17], [15, 17], [16, 17]], C.phosphor)}
      {px([[17, 17]], C.magenta)}
      {/* torn perforation tail */}
      {px(
        [
          [11, 21], [13, 21], [15, 21], [17, 21], [19, 21], [21, 21],
          [12, 22], [14, 22], [16, 22], [18, 22], [20, 22],
          [11, 23], [13, 23], [15, 23], [17, 23], [19, 23], [21, 23],
          [12, 24], [14, 24], [16, 24], [18, 24], [20, 24],
        ],
        C.bone,
      )}
      {/* printer base */}
      {px(outlineRect(7, 26, 24, 28), C.grid)}
      {px(fillRect(8, 27, 15, 1), C.screen)}
      {px([[9, 27], [10, 27], [11, 27]], C.cyan)}
      {/* paper feed slot */}
      {px([[14, 25], [15, 25], [16, 25], [17, 25]], C.grid)}
    </PixelGrid>
  );
}

export type GleanWordmarkSize = 'sm' | 'md' | 'lg' | 'xl';

const WORDMARK_SIZE: Record<GleanWordmarkSize, string> = {
  sm: 'text-[8px] sm:text-[10px]',
  md: 'text-[11px] sm:text-[13px]',
  lg: 'text-[14px] sm:text-[18px]',
  xl: 'text-xl sm:text-3xl',
};

export function GleanWordmark({
  size = 'md',
  className = '',
  glow = false,
}: {
  size?: GleanWordmarkSize;
  className?: string;
  glow?: boolean;
}) {
  return (
    <span className={`font-pixel ${WORDMARK_SIZE[size]} ${className}`}>
      <span className={glow ? 'text-phosphor glow-text' : 'text-phosphor'}>
        GLEAN
      </span>
      <span className="text-magenta">AI</span>
    </span>
  );
}

export function GleanLogoLockup({
  variant = 'coin-slot',
  animated = false,
  size = 'md',
  showTagline = false,
  className = '',
}: {
  variant?: GleanLogoVariant;
  animated?: boolean;
  size?: GleanWordmarkSize;
  showTagline?: boolean;
  className?: string;
}) {
  const iconSize =
    size === 'xl' ? 'h-16 w-16' : size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-6 w-6' : 'h-9 w-9';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`shrink-0 ${iconSize}`}>
        <GleanLogo variant={variant} animated={animated} />
      </div>
      <div className="flex flex-col gap-0.5">
        <GleanWordmark size={size} glow />
        {showTagline ? (
          <span className="font-term text-[14px] text-ash sm:text-[16px]">
            {'// onboarding arcade'}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const FINALIST_LOGOS = [
  {
    id: 2,
    variant: 'crt' as const,
    name: 'CRT G + Cursor',
    tagline: 'Arcade terminal — strongest brand identity',
    bestFor: 'App icon, header, Telegram bot',
    animated: true,
  },
  {
    id: 6,
    variant: 'wallet-bolt' as const,
    name: 'Wallet + Bolt',
    tagline: 'Connect wallet → battle — action-forward',
    bestFor: 'Wallet Wars, play screens, CTAs',
    animated: false,
  },
  {
    id: 8,
    variant: 'receipt' as const,
    name: 'Receipt Ribbon G',
    tagline: 'Your on-chain story, printed — distinctive',
    bestFor: 'Receipt mode, share cards, social',
    animated: false,
  },
] as const;
