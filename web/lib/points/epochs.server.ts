import { getServiceClient } from '@/lib/supabaseServer';

type Supa = ReturnType<typeof getServiceClient>;

export interface EpochRow {
  id: string;
  slug: string;
  starts_at: string;
  ends_at: string;
}

function mondayUtc(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function epochSlug(start: Date): string {
  const y = start.getUTCFullYear();
  const jan1 = new Date(Date.UTC(y, 0, 1));
  const week = Math.ceil(((start.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7);
  return `${y}-W${String(week).padStart(2, '0')}`;
}

export function currentEpochBounds(now = new Date()): { startsAt: Date; endsAt: Date; slug: string } {
  const startsAt = mondayUtc(now);
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + 7);
  return { startsAt, endsAt, slug: epochSlug(startsAt) };
}

export async function getOrCreateCurrentEpoch(supabase: Supa): Promise<EpochRow> {
  const { startsAt, endsAt, slug } = currentEpochBounds();

  const { data: existing, error: findErr } = await supabase
    .from('epochs')
    .select('id, slug, starts_at, ends_at')
    .eq('slug', slug)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing as EpochRow;

  const { data: created, error: insertErr } = await supabase
    .from('epochs')
    .insert({
      slug,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select('id, slug, starts_at, ends_at')
    .single();
  if (insertErr) throw insertErr;
  return created as EpochRow;
}
