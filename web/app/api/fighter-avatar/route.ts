import { NextResponse } from 'next/server';
import type { FighterRarity } from '@/lib/wallet-wars/rarity';
import { lookupKol } from '@/lib/wallet-wars/kolRegistry';
import {
  buildFighterTraits,
  composeFighterRgba,
  composeFighterSvg,
  scaleRgbaNearest,
} from '@/lib/wallet-wars/fighterTraits';
import { encodePngRgba } from '@/lib/wallet-wars/pngEncode';
import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RARITIES = new Set<FighterRarity>(['common', 'rare', 'epic', 'legendary']);

function parseStat(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(150, Math.max(0, Math.round(n)));
}

function parseRarity(raw: string | null): FighterRarity {
  const r = (raw || 'common').toLowerCase() as FighterRarity;
  return RARITIES.has(r) ? r : 'common';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 'svg').toLowerCase();
  const wallet = searchParams.get('wallet')?.trim() || '';

  if (wallet) {
    const kol = lookupKol(wallet);
    if (kol) {
      const rel = format === 'png' ? kol.avatarPng : kol.avatarSvg;
      const filePath = path.join(process.cwd(), 'public', rel.replace(/^\//, ''));
      try {
        const buf = await readFile(filePath);
        return new NextResponse(new Uint8Array(buf), {
          headers: {
            'Content-Type': format === 'png' ? 'image/png' : 'image/svg+xml',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          },
        });
      } catch {
        return NextResponse.redirect(new URL(rel, request.url));
      }
    }
  }

  const rarity = parseRarity(searchParams.get('rarity'));
  const stats = {
    strike: parseStat(searchParams.get('strike')),
    shield: parseStat(searchParams.get('shield')),
    power: parseStat(searchParams.get('power')),
    armor: parseStat(searchParams.get('armor')),
    agility: parseStat(searchParams.get('agility')),
  };

  const traits = buildFighterTraits(stats, rarity);

  if (format === 'png') {
    try {
      const rgba32 = composeFighterRgba(traits);
      const rgba512 = scaleRgbaNearest(rgba32, 32, 512);
      const png = encodePngRgba(512, 512, rgba512);
      return new NextResponse(new Uint8Array(png), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    } catch (err) {
      console.error('[api/fighter-avatar] png', err);
      return NextResponse.json({ error: 'Could not render PNG.' }, { status: 500 });
    }
  }

  const svg = composeFighterSvg(traits);
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
