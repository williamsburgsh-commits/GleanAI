import type { CSSProperties } from 'react';

/**
 * 8-bit pixel-art sprites, hand-built from <rect> blocks on a grid so they
 * render as genuine blocky arcade art (no flat line icons). Each sprite uses
 * `currentColor` for its primary ink so it inherits text color / tones.
 *
 * These are purely decorative presentation — no data, no logic.
 */

interface SpriteProps {
  className?: string;
  style?: CSSProperties;
  title?: string;
}

// Helper: a viewBox of WxH "cells", each cell = 1 unit. shape-rendering crisp
// keeps edges pixel-sharp at any size. viewBox starts at -0.5 so 1px strokes
// land on whole pixels.
function Grid({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {children}
    </svg>
  );
}

/** Draw a run of filled cells. cells = array of "x,y" on a 1-unit grid. */
function cells(list: [number, number][], fill = 'currentColor') {
  return list.map(([x, y], i) => (
    <rect key={i} x={x} y={y} width={1} height={1} fill={fill} />
  ));
}

/* ── Wallet: a blocky billfold with a coin slot ── (8 x 7) */
export function PixelWallet({ className, style, title }: SpriteProps) {
  return (
    <Grid w={8} h={7}>
      <title>{title ?? 'wallet'}</title>
      {cells(
        [
          [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
          [1, 2], [6, 2],
          [1, 3], [5, 3], [6, 3],
          [1, 4], [6, 4],
          [1, 5], [6, 5],
          [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6],
        ],
        'currentColor',
      )}
      {/* coin slot */}
      {cells([[4, 3]], '#06080d')}
      {cells([[5, 4]], 'currentColor')}
    </Grid>
  );
}

/* ── Coin / SOL token: a coin with a $ slash, the primary currency sprite (9 x 9) */
export function PixelCoin({ className, style, title }: SpriteProps) {
  return (
    <Grid w={9} h={9}>
      <title>{title ?? 'coin'}</title>
      {cells(
        [
          [3, 1], [4, 1], [5, 1],
          [2, 2], [6, 2],
          [1, 3], [7, 3],
          [1, 4], [7, 4],
          [1, 5], [7, 5],
          [2, 6], [6, 6],
          [3, 7], [4, 7], [5, 7],
        ],
        'currentColor',
      )}
      {/* S / $ glyph cut from the coin body */}
      {cells(
        [[4, 2], [3, 3], [3, 4], [4, 5], [5, 6]],
        '#06080d',
      )}
    </Grid>
  );
}

/* ── NFT badge: a framed picture with a diamond + star ── (9 x 8) */
export function PixelNft({ className, style, title }: SpriteProps) {
  return (
    <Grid w={9} h={8}>
      <title>{title ?? 'nft'}</title>
      {cells(
        [
          [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1],
          [1, 2], [7, 2],
          [1, 3], [7, 3],
          [1, 4], [7, 4],
          [1, 5], [7, 5],
          [1, 6], [7, 6],
          [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7],
        ],
        'currentColor',
      )}
      {/* inner art: little mountain + sun */}
      {cells([[3, 4], [3, 5], [4, 5], [5, 4]], '#06080d')}
    </Grid>
  );
}

/* ── Arrow ▸ (play / forward) ── (5 x 7) */
export function PixelArrowRight({ className, style, title }: SpriteProps) {
  return (
    <Grid w={5} h={7}>
      <title>{title ?? 'go'}</title>
      {cells(
        [
          [1, 3],
          [2, 2], [2, 4],
          [3, 1], [3, 5],
          [4, 0], [4, 6],
        ],
        'currentColor',
      )}
    </Grid>
  );
}

/* ── Arrow ◂ (back) ── (5 x 7) */
export function PixelArrowLeft({ className, style, title }: SpriteProps) {
  return (
    <Grid w={5} h={7}>
      <title>{title ?? 'back'}</title>
      {cells(
        [
          [3, 3],
          [2, 2], [2, 4],
          [1, 1], [1, 5],
          [0, 0], [0, 6],
        ],
        'currentColor',
      )}
    </Grid>
  );
}

/* ── Check ✓ (cleared quest) ── (8 x 7) */
export function PixelCheck({ className, style, title }: SpriteProps) {
  return (
    <Grid w={8} h={7}>
      <title>{title ?? 'cleared'}</title>
      {cells(
        [
          [0, 4],
          [1, 5],
          [2, 6],
          [3, 5],
          [4, 4],
          [5, 3],
          [6, 2],
          [7, 1],
        ],
        'currentColor',
      )}
    </Grid>
  );
}

/* ── Lock (locked / needs wallet) ── (7 x 8) */
export function PixelLock({ className, style, title }: SpriteProps) {
  return (
    <Grid w={7} h={8}>
      <title>{title ?? 'locked'}</title>
      {/* shackle */}
      {cells(
        [[2, 1], [4, 1], [2, 2], [4, 2], [2, 3], [4, 3]],
        'currentColor',
      )}
      {/* body */}
      {cells(
        [
          [1, 4], [2, 4], [3, 4], [4, 4], [5, 4],
          [1, 5], [5, 5],
          [1, 6], [5, 6],
          [1, 7], [2, 7], [3, 7], [4, 7], [5, 7],
        ],
        'currentColor',
      )}
      {/* keyhole */}
      {cells([[3, 5]], '#06080d')}
      {cells([[3, 6]], '#06080d')}
    </Grid>
  );
}

/* ── Power bolt (sprint / start) ── (6 x 9) */
export function PixelBolt({ className, style, title }: SpriteProps) {
  return (
    <Grid w={6} h={9}>
      <title>{title ?? 'start'}</title>
      {cells(
        [
          [3, 0], [3, 1], [3, 2],
          [2, 3], [2, 4],
          [3, 4], [3, 5], [3, 6],
          [2, 7],
          [1, 8],
        ],
        'currentColor',
      )}
    </Grid>
  );
}

/* ── Star (score / points) ── (8 x 8) */
export function PixelStar({ className, style, title }: SpriteProps) {
  return (
    <Grid w={8} h={8}>
      <title>{title ?? 'star'}</title>
      {cells(
        [
          [3, 0], [4, 0],
          [3, 1], [4, 1],
          [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3],
          [1, 4], [2, 4], [5, 4], [6, 4],
          [1, 5], [2, 5], [5, 5], [6, 5],
          [2, 6], [3, 6], [4, 6], [5, 6],
        ],
        'currentColor',
      )}
    </Grid>
  );
}

/* ── Swap (two opposing arrows) ── (9 x 9) */
export function PixelSwap({ className, style, title }: SpriteProps) {
  return (
    <Grid w={9} h={9}>
      <title>{title ?? 'swap'}</title>
      {/* top arrow → */}
      {cells(
        [
          [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
          [6, 1], [6, 3],
          [7, 2],
        ],
        'currentColor',
      )}
      {/* bottom arrow ← */}
      {cells(
        [
          [3, 6], [4, 6], [5, 6], [6, 6], [7, 6],
          [2, 5], [2, 7],
          [1, 6],
        ],
        'currentColor',
      )}
    </Grid>
  );
}

/* ── Stake (down-arrow into a stack) ── (8 x 8) */
export function PixelStake({ className, style, title }: SpriteProps) {
  return (
    <Grid w={8} h={8}>
      <title>{title ?? 'stake'}</title>
      {/* down arrow */}
      {cells(
        [
          [3, 0], [4, 0],
          [3, 1], [4, 1],
          [3, 2], [4, 2],
          [2, 3], [3, 3], [4, 3], [5, 3],
          [3, 4], [4, 4],
        ],
        'currentColor',
      )}
      {/* base / vault */}
      {cells(
        [
          [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
          [1, 6], [6, 6],
          [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
        ],
        'currentColor',
      )}
    </Grid>
  );
}

/* ── Trophy (leaderboard) ── (9 x 9) */
export function PixelTrophy({ className, style, title }: SpriteProps) {
  return (
    <Grid w={9} h={9}>
      <title>{title ?? 'leaderboard'}</title>
      {cells(
        [
          [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
          [1, 2], [7, 2],
          [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3],
          [3, 4], [4, 4], [5, 4],
          [3, 5], [4, 5], [5, 5],
          [3, 6], [5, 6],
          [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
        ],
        'currentColor',
      )}
    </Grid>
  );
}

/* ── Ghost player avatar (player panel) ── (8 x 9) */
export function PixelGhost({ className, style, title }: SpriteProps) {
  return (
    <Grid w={8} h={9}>
      <title>{title ?? 'player'}</title>
      {cells(
        [
          [2, 1], [3, 1], [4, 1], [5, 1],
          [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
          [1, 3], [6, 3],
          [1, 4], [3, 4], [4, 4], [6, 4],
          [1, 5], [6, 5],
          [1, 6], [6, 6],
          [1, 7], [3, 7], [4, 7], [6, 7],
          [1, 8], [2, 8], [5, 8], [6, 8],
        ],
        'currentColor',
      )}
      {/* eyes */}
      {cells([[2, 3]], '#06080d')}
      {cells([[5, 3]], '#06080d')}
    </Grid>
  );
}

/* ── Insert-coin slot icon ── (8 x 9) */
export function PixelCoinSlot({ className, style, title }: SpriteProps) {
  return (
    <Grid w={8} h={9}>
      <title>{title ?? 'insert coin'}</title>
      {/* cabinet top */}
      {cells(
        [
          [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
          [1, 2], [6, 2],
          [1, 3], [3, 3], [4, 3], [6, 3],
          [1, 4], [3, 4], [4, 4], [6, 4],
          [1, 5], [6, 5],
          [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6],
        ],
        'currentColor',
      )}
      {/* coin dropping in */}
      {cells([[3, 7], [4, 7]], 'currentColor')}
      {cells([[3, 8], [4, 8]], 'currentColor')}
    </Grid>
  );
}
