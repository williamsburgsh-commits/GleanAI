import type { CSSProperties, ReactNode } from 'react';
import { palette } from '@/lib/palette';

export const LOGO_COLORS = {
  void: palette.void,
  screen: palette.screen,
  grid: palette.grid,
  bone: palette.bone,
  phosphor: palette.phosphor,
  cyan: palette.cyan,
  amber: palette.amber,
  magenta: palette.magenta,
  scanline: '#0d1219',
  receiptInk: '#b8c0b8',
} as const;

export function PixelGrid({
  w,
  h,
  children,
  className = '',
  style,
}: {
  w: number;
  h: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: 'pixelated', display: 'block', ...style }}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function px(list: [number, number][], fill: string) {
  return list.map(([x, y], i) => (
    <rect key={`${x}-${y}-${fill}-${i}`} x={x} y={y} width={1} height={1} fill={fill} />
  ));
}

export function fillRect(
  x: number,
  y: number,
  w: number,
  h: number,
): [number, number][] {
  return Array.from({ length: h }, (_, row) =>
    Array.from({ length: w }, (_, col) => [x + col, y + row] as [number, number]),
  ).flat();
}

export function outlineRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): [number, number][] {
  const cells: [number, number][] = [];
  for (let x = x0; x <= x1; x++) {
    cells.push([x, y0], [x, y1]);
  }
  for (let y = y0 + 1; y < y1; y++) {
    cells.push([x0, y], [x1, y]);
  }
  return cells;
}
