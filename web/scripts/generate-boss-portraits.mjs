/**
 * Themed pixel boss portraits for Boss Gauntlet.
 * Output: public/bosses/{slug}.svg (32×32, crisp pixel grid)
 *
 * Art bar: Coin Slot / logo concepts — clear silhouette, outline,
 * 2–3 value shading, one brand accent per boss.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/bosses');
const SIZE = 32;

const C = {
  void: '#06080d',
  screen: '#0a0e15',
  grid: '#1b2130',
  bone: '#e7ece5',
  phosphor: '#27ff7d',
  cyan: '#2bd9ff',
  amber: '#ffb437',
  magenta: '#ff3da6',
  shadow: '#0d1219',
  mid: '#2a3344',
  bull: '#141a22',
  bullMid: '#1e2733',
  ghost: '#3d4d66',
  ghostLite: '#6a7f9a',
  steel: '#4a5568',
  steelLite: '#7a8799',
  fur: '#3a2a1a',
  furLite: '#6b4e2e',
  skin: '#c4a574',
};

function fillRect(x, y, w, h) {
  const cells = [];
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) cells.push([x + col, y + row]);
  }
  return cells;
}

function outlineRect(x0, y0, x1, y1) {
  const cells = [];
  for (let x = x0; x <= x1; x++) cells.push([x, y0], [x, y1]);
  for (let y = y0 + 1; y < y1; y++) cells.push([x0, y], [x1, y]);
  return cells;
}

/** Disk approx: cells where (x-cx)^2 + (y-cy)^2 <= r^2 */
function disk(cx, cy, r) {
  const cells = [];
  const r2 = r * r;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) cells.push([x, y]);
    }
  }
  return cells;
}

/** Ring: outer disk minus inner disk */
function ring(cx, cy, rOuter, rInner) {
  const inner = new Set(disk(cx, cy, rInner).map(([x, y]) => `${x},${y}`));
  return disk(cx, cy, rOuter).filter(([x, y]) => !inner.has(`${x},${y}`));
}

function cells(...lists) {
  const result = [];
  for (const item of lists) {
    if (!item) continue;
    if (Array.isArray(item[0])) result.push(...item);
    else result.push(item);
  }
  return result;
}

function portraitSvg(layers) {
  const rects = layers
    .flatMap(({ fill, list }) =>
      list.map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`),
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" shape-rendering="crispEdges">
<rect width="${SIZE}" height="${SIZE}" fill="${C.void}"/>
${rects}
</svg>`;
}

/* ── Gatekeeper: helmeted arcade warden ── */
function gatekeeper() {
  return [
    // Shoulder plate / body
    { fill: C.grid, list: cells(fillRect(8, 22, 16, 6), fillRect(6, 24, 4, 4), fillRect(22, 24, 4, 4)) },
    { fill: C.mid, list: cells(fillRect(9, 23, 14, 4), fillRect(7, 25, 3, 2), fillRect(22, 25, 3, 2)) },
    // Helmet outline
    { fill: C.shadow, list: cells(fillRect(9, 4, 14, 18), [8, 6], [8, 7], [8, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [8, 15], [8, 16], [8, 17], [8, 18], [23, 6], [23, 7], [23, 8], [23, 9], [23, 10], [23, 11], [23, 12], [23, 13], [23, 14], [23, 15], [23, 16], [23, 17], [23, 18], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [15, 3], [16, 3], [17, 3], [18, 3], [19, 3], [20, 3], [21, 3]) },
    // Helmet steel
    { fill: C.steel, list: cells(fillRect(10, 5, 12, 15), fillRect(11, 4, 10, 1), [9, 7], [9, 8], [9, 9], [9, 10], [9, 11], [9, 12], [9, 13], [9, 14], [9, 15], [9, 16], [22, 7], [22, 8], [22, 9], [22, 10], [22, 11], [22, 12], [22, 13], [22, 14], [22, 15], [22, 16]) },
    { fill: C.steelLite, list: cells(fillRect(11, 5, 4, 3), [12, 4], [13, 4], [14, 8], [15, 8], [16, 8], [17, 8], [18, 5], [19, 5], [20, 5]) },
    // Visor slit (cyan glow)
    { fill: C.shadow, list: cells(fillRect(11, 10, 10, 3)) },
    { fill: C.cyan, list: cells(fillRect(12, 11, 8, 1), [11, 11], [20, 11]) },
    { fill: C.phosphor, list: cells([13, 11], [14, 11], [17, 11], [18, 11]) },
    // Chin / mouth grill
    { fill: C.grid, list: cells(fillRect(12, 16, 8, 3), [13, 19], [14, 19], [15, 19], [16, 19], [17, 19], [18, 19]) },
    { fill: C.mid, list: cells([13, 17], [15, 17], [17, 17], [14, 18], [16, 18]) },
    // Crest spike
    { fill: C.amber, list: cells([15, 2], [16, 2], [15, 1], [16, 1], [15, 3], [16, 3]) },
    // Collar latch
    { fill: C.phosphor, list: cells([14, 21], [15, 21], [16, 21], [17, 21]) },
  ];
}

/* ── Degen Duke: crowned ape bust ── */
function degenDuke() {
  return [
    // Shoulders / hoodie
    { fill: C.magenta, list: cells(fillRect(7, 23, 18, 5), fillRect(5, 25, 4, 4), fillRect(23, 25, 4, 4)) },
    { fill: C.grid, list: cells(fillRect(8, 24, 16, 3)) },
    // Crown
    { fill: C.amber, list: cells(
      [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4], [18, 4], [19, 4], [20, 4], [21, 4],
      [10, 5], [21, 5],
      [10, 3], [12, 2], [14, 1], [15, 1], [16, 1], [17, 2], [19, 3], [21, 3],
      [11, 3], [13, 2], [18, 2], [20, 3],
      [12, 3], [13, 3], [14, 2], [15, 2], [16, 2], [17, 3], [18, 3],
    ) },
    { fill: C.bone, list: cells([14, 3], [15, 3], [16, 3], [13, 4], [18, 4]) },
    // Head fur outline
    { fill: C.shadow, list: cells(fillRect(9, 6, 14, 14), [8, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [8, 15], [8, 16], [23, 8], [23, 9], [23, 10], [23, 11], [23, 12], [23, 13], [23, 14], [23, 15], [23, 16]) },
    { fill: C.fur, list: cells(fillRect(10, 7, 12, 12), [9, 9], [9, 10], [9, 11], [9, 12], [9, 13], [9, 14], [22, 9], [22, 10], [22, 11], [22, 12], [22, 13], [22, 14]) },
    { fill: C.furLite, list: cells(fillRect(11, 8, 4, 3), [12, 7], [13, 7], [18, 8], [19, 8], [20, 8]) },
    // Face muzzle
    { fill: C.skin, list: cells(fillRect(12, 12, 8, 6), [13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11], [13, 18], [14, 18], [15, 18], [16, 18], [17, 18], [18, 18]) },
    // Eyes (smug)
    { fill: C.void, list: cells([12, 10], [13, 10], [18, 10], [19, 10], [12, 11], [19, 11]) },
    { fill: C.phosphor, list: cells([13, 10], [18, 10]) },
    // Brow
    { fill: C.fur, list: cells([11, 9], [12, 9], [13, 9], [18, 9], [19, 9], [20, 9]) },
    // Nose / mouth
    { fill: C.shadow, list: cells([15, 13], [16, 13], [14, 15], [15, 15], [16, 15], [17, 15]) },
    { fill: C.magenta, list: cells([15, 16], [16, 16]) },
    // Diamond hand accent on chest
    { fill: C.cyan, list: cells([14, 26], [15, 25], [16, 25], [17, 26], [15, 26], [16, 26], [15, 27], [16, 27]) },
    { fill: C.bone, list: cells([15, 26], [16, 26]) },
  ];
}

/* ── NFT Phantom: ghost in picture frame ── */
function nftPhantom() {
  return [
    // Outer frame
    { fill: C.amber, list: cells(outlineRect(4, 3, 27, 28), outlineRect(5, 4, 26, 27)) },
    { fill: C.grid, list: cells(outlineRect(6, 5, 25, 26)) },
    // Frame corners gems
    { fill: C.magenta, list: cells([4, 3], [27, 3], [4, 28], [27, 28], [5, 4], [26, 4], [5, 27], [26, 27]) },
    // Inner void / canvas
    { fill: C.screen, list: cells(fillRect(7, 6, 18, 20)) },
    // Ghost body (translucent mid)
    { fill: C.ghost, list: cells(
      fillRect(11, 9, 10, 12),
      [10, 11], [10, 12], [10, 13], [10, 14], [10, 15], [10, 16],
      [21, 11], [21, 12], [21, 13], [21, 14], [21, 15], [21, 16],
      [12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8],
      [11, 21], [13, 22], [15, 21], [17, 22], [19, 21], [12, 21], [14, 22], [16, 21], [18, 22], [20, 21],
    ) },
    { fill: C.ghostLite, list: cells(fillRect(12, 10, 4, 4), [13, 9], [14, 9], [18, 11], [19, 11], [18, 12]) },
    // Eyes
    { fill: C.void, list: cells([13, 12], [14, 12], [17, 12], [18, 12], [13, 13], [14, 13], [17, 13], [18, 13]) },
    { fill: C.cyan, list: cells([13, 12], [17, 12]) },
    { fill: C.phosphor, list: cells([14, 13], [18, 13]) },
    // Mouth O
    { fill: C.void, list: cells([15, 16], [16, 16], [15, 17], [16, 17]) },
    // Floating pixels (metadata dust)
    { fill: C.phosphor, list: cells([8, 8], [23, 10], [9, 18], [22, 20]) },
    { fill: C.cyan, list: cells([24, 15], [8, 14]) },
  ];
}

/* ── Ansem: black bull head ── */
function ansem() {
  return [
    // Neck / shoulders
    { fill: C.bullMid, list: cells(fillRect(10, 24, 12, 5), fillRect(8, 26, 4, 3), fillRect(20, 26, 4, 3)) },
    { fill: C.grid, list: cells(fillRect(11, 25, 10, 3)) },
    // Horns (phosphor tips)
    { fill: C.bone, list: cells(
      [4, 8], [5, 7], [6, 6], [7, 5], [8, 5], [9, 6],
      [27, 8], [26, 7], [25, 6], [24, 5], [23, 5], [22, 6],
      [5, 8], [6, 7], [7, 6], [8, 6],
      [26, 8], [25, 7], [24, 6], [23, 6],
    ) },
    { fill: C.phosphor, list: cells([3, 9], [4, 9], [28, 9], [27, 9], [4, 7], [27, 7]) },
    // Head silhouette
    { fill: C.shadow, list: cells(
      fillRect(9, 8, 14, 14),
      [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [8, 15], [8, 16], [8, 17],
      [23, 10], [23, 11], [23, 12], [23, 13], [23, 14], [23, 15], [23, 16], [23, 17],
      [10, 7], [11, 7], [12, 7], [13, 7], [14, 7], [15, 7], [16, 7], [17, 7], [18, 7], [19, 7], [20, 7], [21, 7],
      [11, 22], [12, 22], [13, 22], [14, 22], [15, 22], [16, 22], [17, 22], [18, 22], [19, 22], [20, 22],
    ) },
    { fill: C.bull, list: cells(
      fillRect(10, 9, 12, 12),
      [9, 11], [9, 12], [9, 13], [9, 14], [9, 15], [9, 16],
      [22, 11], [22, 12], [22, 13], [22, 14], [22, 15], [22, 16],
    ) },
    { fill: C.bullMid, list: cells(fillRect(12, 10, 4, 3), [13, 9], [14, 9], [18, 10], [19, 10]) },
    // Eyes (glow)
    { fill: C.phosphor, list: cells([12, 12], [13, 12], [18, 12], [19, 12], [12, 13], [19, 13]) },
    { fill: C.void, list: cells([13, 13], [18, 13]) },
    // Snout
    { fill: C.mid, list: cells(fillRect(13, 16, 6, 4), [14, 15], [15, 15], [16, 15], [17, 15], [14, 20], [15, 20], [16, 20], [17, 20]) },
    { fill: C.shadow, list: cells([14, 17], [17, 17], [15, 18], [16, 18]) },
    // Nose ring
    { fill: C.magenta, list: cells([15, 19], [16, 19], [14, 19], [17, 19], [15, 20], [16, 20]) },
    { fill: C.amber, list: cells([15, 19], [16, 19]) },
  ];
}

/* ── Jupiter Jack: route-runner pilot + orbital ring ── */
function jupiterJack() {
  return [
    // Orbital ring
    { fill: C.cyan, list: cells(ring(15, 14, 12, 10)) },
    { fill: C.phosphor, list: cells([15, 2], [16, 2], [3, 14], [28, 14], [15, 26], [16, 26]) },
    // Planet / body core
    { fill: C.grid, list: cells(disk(15, 15, 7)) },
    { fill: C.screen, list: cells(disk(15, 15, 6)) },
    // Helmet / face plate
    { fill: C.steel, list: cells(fillRect(11, 10, 10, 10), [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9], [19, 9]) },
    { fill: C.steelLite, list: cells(fillRect(12, 11, 3, 2), [13, 10], [14, 10]) },
    // Visor
    { fill: C.void, list: cells(fillRect(12, 13, 8, 3)) },
    { fill: C.amber, list: cells(fillRect(13, 14, 6, 1), [12, 14], [19, 14]) },
    { fill: C.phosphor, list: cells([14, 14], [15, 14], [16, 14]) },
    // Headset
    { fill: C.magenta, list: cells([10, 12], [10, 13], [10, 14], [10, 15], [21, 12], [21, 13], [21, 14], [21, 15], [9, 13], [9, 14], [22, 13], [22, 14]) },
    // Chin / neck
    { fill: C.mid, list: cells([13, 19], [14, 19], [15, 19], [16, 19], [17, 19], [18, 19], [14, 20], [15, 20], [16, 20], [17, 20]) },
    // Route spark on ring
    { fill: C.amber, list: cells([26, 10], [27, 10], [26, 11], [5, 18], [6, 18]) },
    // Shoulders
    { fill: C.grid, list: cells(fillRect(9, 22, 14, 5), fillRect(7, 24, 4, 4), fillRect(21, 24, 4, 4)) },
    { fill: C.cyan, list: cells([14, 23], [15, 23], [16, 23], [17, 23]) },
  ];
}

/* ── Validator Vex: stake tower sovereign ── */
function validatorVex() {
  return [
    // Base / shoulders
    { fill: C.grid, list: cells(fillRect(6, 24, 20, 5), fillRect(4, 26, 6, 4), fillRect(22, 26, 6, 4)) },
    { fill: C.mid, list: cells(fillRect(8, 25, 16, 3)) },
    // Tower body
    { fill: C.shadow, list: cells(fillRect(10, 5, 12, 20), [9, 7], [9, 8], [9, 9], [9, 10], [9, 11], [9, 12], [9, 13], [9, 14], [9, 15], [9, 16], [9, 17], [9, 18], [9, 19], [9, 20], [9, 21], [22, 7], [22, 8], [22, 9], [22, 10], [22, 11], [22, 12], [22, 13], [22, 14], [22, 15], [22, 16], [22, 17], [22, 18], [22, 19], [22, 20], [22, 21]) },
    { fill: C.steel, list: cells(fillRect(11, 6, 10, 18)) },
    { fill: C.steelLite, list: cells(fillRect(12, 7, 3, 4), [13, 6], [14, 6]) },
    // Crown / antenna
    { fill: C.magenta, list: cells(
      [12, 3], [13, 3], [14, 3], [15, 3], [16, 3], [17, 3], [18, 3], [19, 3],
      [13, 2], [15, 1], [16, 1], [18, 2],
      [14, 2], [15, 2], [16, 2], [17, 2],
      [15, 0], [16, 0],
    ) },
    { fill: C.amber, list: cells([15, 1], [16, 1]) },
    // LED uptime columns
    { fill: C.phosphor, list: cells(
      [13, 9], [13, 10], [13, 11], [13, 12], [13, 13], [13, 14],
      [18, 9], [18, 10], [18, 11], [18, 12], [18, 13],
    ) },
    { fill: C.cyan, list: cells(
      [14, 9], [14, 10], [14, 11], [14, 12], [14, 13], [14, 14], [14, 15],
      [17, 9], [17, 10], [17, 11], [17, 12], [17, 13], [17, 14],
    ) },
    { fill: C.amber, list: cells([15, 10], [16, 10], [15, 11], [16, 11], [15, 16], [16, 16], [15, 17], [16, 17]) },
    // Face slit / sensor
    { fill: C.void, list: cells(fillRect(13, 18, 6, 2)) },
    { fill: C.phosphor, list: cells([14, 18], [15, 18], [16, 18], [17, 18]) },
    // Stake badge
    { fill: C.amber, list: cells([14, 21], [15, 21], [16, 21], [17, 21], [15, 22], [16, 22]) },
  ];
}

/* ── Toly: pixel wizard + staff + Solana glyph ── */
function toly() {
  return [
    // Robe / body
    { fill: C.magenta, list: cells(fillRect(10, 16, 12, 11), fillRect(8, 20, 4, 8), fillRect(20, 20, 4, 8), [9, 18], [9, 19], [22, 18], [22, 19]) },
    { fill: C.grid, list: cells(fillRect(11, 18, 10, 8)) },
    // Hood
    { fill: C.magenta, list: cells(
      fillRect(10, 4, 12, 10),
      [9, 6], [9, 7], [9, 8], [9, 9], [9, 10], [9, 11], [9, 12],
      [22, 6], [22, 7], [22, 8], [22, 9], [22, 10], [22, 11], [22, 12],
      [11, 3], [12, 3], [13, 3], [14, 3], [15, 3], [16, 3], [17, 3], [18, 3], [19, 3], [20, 3],
      [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2], [18, 2], [19, 2],
      [14, 1], [15, 1], [16, 1], [17, 1],
    ) },
    { fill: C.shadow, list: cells(fillRect(12, 7, 8, 7), [13, 6], [14, 6], [15, 6], [16, 6], [17, 6], [18, 6]) },
    // Face
    { fill: C.skin, list: cells(fillRect(13, 8, 6, 5), [14, 7], [15, 7], [16, 7], [17, 7]) },
    { fill: C.void, list: cells([14, 9], [17, 9], [14, 10], [17, 10]) },
    { fill: C.cyan, list: cells([14, 9], [17, 9]) },
    { fill: C.shadow, list: cells([15, 11], [16, 11]) },
    // Beard hint
    { fill: C.bone, list: cells([14, 12], [15, 12], [16, 12], [17, 12], [15, 13], [16, 13]) },
    // Staff (left)
    { fill: C.phosphor, list: cells(
      [5, 8], [5, 9], [5, 10], [5, 11], [5, 12], [5, 13], [5, 14], [5, 15], [5, 16], [5, 17], [5, 18], [5, 19], [5, 20], [5, 21], [5, 22], [5, 23], [5, 24], [5, 25],
      [4, 9], [4, 10], [6, 9], [6, 10],
      [4, 7], [5, 6], [6, 7], [5, 7],
    ) },
    { fill: C.amber, list: cells([5, 6], [4, 8], [6, 8]) },
    // Solana glyph on chest
    { fill: C.cyan, list: cells(
      [13, 19], [14, 19], [15, 19], [16, 19], [17, 19], [18, 19],
      [14, 20], [17, 20],
      [13, 21], [14, 21], [15, 21], [16, 21], [17, 21], [18, 21],
      [14, 22], [17, 22],
      [13, 23], [14, 23], [15, 23], [16, 23], [17, 23], [18, 23],
    ) },
    { fill: C.phosphor, list: cells([15, 20], [16, 20], [15, 22], [16, 22]) },
    // Hood tip highlight
    { fill: C.bone, list: cells([14, 2], [15, 2], [16, 3]) },
  ];
}

const PORTRAITS = {
  gatekeeper: gatekeeper(),
  'degen-duke': degenDuke(),
  'nft-phantom': nftPhantom(),
  ansem: ansem(),
  'jupiter-jack': jupiterJack(),
  'validator-vex': validatorVex(),
  toly: toly(),
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let Resvg = null;
  try {
    ({ Resvg } = await import('@resvg/resvg-js'));
  } catch {
    console.warn('⚠ @resvg/resvg-js unavailable — SVG only (no PNG for OG)');
  }

  /** @type {Record<string, string>} */
  const dataUrls = {};

  for (const [slug, layers] of Object.entries(PORTRAITS)) {
    const svg = portraitSvg(layers);
    const svgPath = path.join(OUT_DIR, `${slug}.svg`);
    await writeFile(svgPath, svg);
    console.log(`✓ SVG  → ${svgPath}`);

    if (Resvg) {
      const png = new Resvg(svg, { fitTo: { mode: 'width', value: 256 } })
        .render()
        .asPng();
      const pngPath = path.join(OUT_DIR, `${slug}.png`);
      await writeFile(pngPath, png);
      dataUrls[slug] = `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
      console.log(`✓ PNG  → ${pngPath}`);
    }
  }

  if (Object.keys(dataUrls).length > 0) {
    const libPath = path.resolve(__dirname, '../lib/wallet-wars/bossPortraitData.ts');
    const body = `/* Auto-generated by scripts/generate-boss-portraits.mjs — do not edit */
export const BOSS_PORTRAIT_DATA_URL: Record<string, string> = ${JSON.stringify(dataUrls, null, 2)};
`;
    await writeFile(libPath, body);
    console.log(`✓ DATA → ${libPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
