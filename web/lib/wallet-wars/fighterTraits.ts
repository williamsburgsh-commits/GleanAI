import type { FighterRarity } from '@/lib/wallet-wars/rarity';
import type { BaseStats, StatKey } from '@/lib/wallet-wars/fighterStats';
import { STAT_KEYS } from '@/lib/wallet-wars/fighterStats';

export type StatBand = 'low' | 'mid' | 'high';

export interface FighterTraits {
  rarity: FighterRarity;
  aura: FighterRarity;
  powerBand: StatBand;
  armor: StatBand;
  shield: StatBand;
  weapon: StatBand;
  boots: StatBand;
  dominant: StatKey;
}

type Cell = [number, number, string];

export function statBand(n: number): StatBand {
  if (n >= 80) return 'high';
  if (n >= 40) return 'mid';
  return 'low';
}

export function dominantStat(stats: BaseStats): StatKey {
  let best: StatKey = 'strike';
  let bestVal = -1;
  for (const key of STAT_KEYS) {
    const v = stats[key];
    if (v > bestVal) {
      bestVal = v;
      best = key;
    }
  }
  return best;
}

export function buildFighterTraits(stats: BaseStats, rarity: FighterRarity): FighterTraits {
  return {
    rarity,
    aura: rarity,
    powerBand: statBand(stats.power),
    armor: statBand(stats.armor),
    shield: statBand(stats.shield),
    weapon: statBand(stats.strike),
    boots: statBand(stats.agility),
    dominant: dominantStat(stats),
  };
}

const C = {
  bone: '#e7ece5',
  phosphor: '#27ff7d',
  cyan: '#2bd9ff',
  amber: '#ffb437',
  magenta: '#ff3da6',
  purple: '#a855f7',
  zinc: '#71717a',
  dark: '#1b2130',
  red: '#ef4444',
  screen: '#0d1219',
};

function cells(...list: Cell[]): Cell[] {
  return list;
}

function fillRect(x0: number, y0: number, w: number, h: number, color: string): Cell[] {
  const out: Cell[] = [];
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      out.push([x, y, color]);
    }
  }
  return out;
}

/** Rarity border sparks only — transparent interior. */
function auraLayer(rarity: FighterRarity, powerBand: StatBand): Cell[] {
  const color =
    rarity === 'legendary'
      ? C.amber
      : rarity === 'epic'
        ? C.purple
        : rarity === 'rare'
          ? C.cyan
          : C.zinc;
  const intensity = powerBand === 'high' ? 3 : powerBand === 'mid' ? 2 : 1;
  const out: Cell[] = [];
  for (let i = 0; i < intensity; i += 1) {
    const inset = 1 + i;
    for (let x = inset; x < 32 - inset; x += 1) {
      out.push([x, inset, color]);
      out.push([x, 31 - inset, color]);
    }
    for (let y = inset; y < 32 - inset; y += 1) {
      out.push([inset, y, color]);
      out.push([31 - inset, y, color]);
    }
  }
  if (powerBand === 'high') {
    out.push(...cells([4, 4, color], [27, 4, color], [4, 27, color], [27, 27, color]));
  }
  return out;
}

function armorLayer(band: StatBand, dominant: StatKey): Cell[] {
  const boost = dominant === 'armor' ? 1 : 0;
  if (band === 'low') {
    return [
      ...fillRect(13, 16, 6, 2, C.bone),
      ...(boost ? fillRect(12, 15, 8, 1, C.phosphor) : []),
    ];
  }
  if (band === 'mid') {
    return [
      ...fillRect(12, 15, 8, 7, C.bone),
      ...fillRect(13, 16, 6, 5, C.dark),
      ...fillRect(14, 17, 4, 2, C.cyan),
      ...(boost ? fillRect(11, 14, 10, 1, C.phosphor) : []),
    ];
  }
  return [
    ...fillRect(10, 14, 12, 9, C.bone),
    ...fillRect(11, 15, 10, 7, C.screen),
    ...fillRect(13, 17, 6, 3, C.amber),
    ...fillRect(12, 15, 2, 2, C.cyan),
    ...fillRect(18, 15, 2, 2, C.cyan),
    ...(boost ? fillRect(9, 13, 14, 1, C.phosphor) : []),
  ];
}

function shieldLayer(band: StatBand, dominant: StatKey): Cell[] {
  const boost = dominant === 'shield' ? 1 : 0;
  const x = 5 - boost;
  if (band === 'low') {
    return [...fillRect(x, 17, 3, 4, C.cyan), ...fillRect(x + 1, 18, 1, 2, C.bone)];
  }
  if (band === 'mid') {
    return [
      ...fillRect(x - 1, 15, 4, 8, C.cyan),
      ...fillRect(x, 16, 2, 6, C.dark),
      ...fillRect(x, 18, 2, 2, C.phosphor),
    ];
  }
  return [
    ...fillRect(x - 2, 14, 5, 10, C.purple),
    ...fillRect(x - 1, 15, 3, 8, C.dark),
    ...fillRect(x - 1, 17, 3, 3, C.cyan),
    ...cells([x, 16, C.phosphor], [x, 20, C.phosphor]),
  ];
}

function weaponLayer(band: StatBand, dominant: StatKey): Cell[] {
  const boost = dominant === 'strike' ? 1 : 0;
  const x = 23;
  if (band === 'low') {
    return [
      ...fillRect(x, 18, 3 + boost, 2, C.zinc),
      ...fillRect(x + 2, 17, 1, 1, C.bone),
    ];
  }
  if (band === 'mid') {
    return [
      ...fillRect(x, 16, 2, 6, C.bone),
      ...fillRect(x + 2, 14, 3 + boost, 2, C.cyan),
      ...fillRect(x + 2, 15, 4, 1, C.phosphor),
    ];
  }
  return [
    ...fillRect(x - 1, 15, 3, 7, C.dark),
    ...fillRect(x + 2, 12, 5 + boost, 4, C.red),
    ...fillRect(x + 3, 13, 3, 2, C.amber),
    ...cells([x + 6, 14, C.phosphor]),
  ];
}

function bootsLayer(band: StatBand, dominant: StatKey): Cell[] {
  const boost = dominant === 'agility' ? 1 : 0;
  const y = 24;
  if (band === 'low') {
    return [...fillRect(12, y, 3, 3, C.dark), ...fillRect(17, y, 3, 3, C.dark)];
  }
  if (band === 'mid') {
    return [
      ...fillRect(11, y, 4, 4, C.zinc),
      ...fillRect(17, y, 4, 4, C.zinc),
      ...fillRect(11, y + 3, 4, 1, C.cyan),
      ...fillRect(17, y + 3, 4, 1, C.cyan),
    ];
  }
  return [
    ...fillRect(10, y, 5, 4 + boost, C.magenta),
    ...fillRect(17, y, 5, 4 + boost, C.magenta),
    ...fillRect(10, y + 3, 5, 1, C.phosphor),
    ...fillRect(17, y + 3, 5, 1, C.phosphor),
    ...(boost
      ? cells(
          [9, y + 1, C.cyan],
          [8, y + 2, C.cyan],
          [23, y + 1, C.cyan],
          [24, y + 2, C.cyan]
        )
      : []),
  ];
}

function powerAccent(band: StatBand, dominant: StatKey): Cell[] {
  if (dominant !== 'power' && band !== 'high') return [];
  const color = C.amber;
  return cells(
    [15, 16, color],
    [16, 16, color],
    [15, 17, color],
    [16, 17, color],
    [14, 18, color],
    [17, 18, color]
  );
}

function buildGearPixelMap(traits: FighterTraits): Map<string, string> {
  const layers: Cell[] = [
    ...auraLayer(traits.aura, traits.powerBand),
    ...armorLayer(traits.armor, traits.dominant),
    ...bootsLayer(traits.boots, traits.dominant),
    ...shieldLayer(traits.shield, traits.dominant),
    ...weaponLayer(traits.weapon, traits.dominant),
    ...powerAccent(traits.powerBand, traits.dominant),
  ];

  const map = new Map<string, string>();
  for (const [x, y, c] of layers) {
    if (x < 0 || x > 31 || y < 0 || y > 31) continue;
    map.set(`${x},${y}`, c);
  }
  return map;
}

/** Pixel cells for a transparent gear overlay on DiceBear portraits. */
export function getGearOverlayCells(traits: FighterTraits): Cell[] {
  const map = buildGearPixelMap(traits);
  const cells: Cell[] = [];
  for (const [key, fill] of map) {
    const [xs, ys] = key.split(',');
    cells.push([Number(xs), Number(ys), fill]);
  }
  return cells;
}
