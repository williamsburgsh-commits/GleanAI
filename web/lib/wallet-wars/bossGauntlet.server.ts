import { getServiceClient } from '@/lib/supabaseServer';
import {
  awardBattlePoints,
  awardBattleQuests,
  type UserRow,
} from '@/lib/wallet-wars/fighter.server';
import { getQuestBySlug, recordCompletion } from '@/lib/quests.server';
import {
  BOSS_ORDER,
  BOSSES,
  getBossDefinition,
  isBossSlug,
  nextBossSlug,
  randomBossTaunt,
  type BossDefinition,
  type BossSlug,
} from '@/lib/wallet-wars/bosses';

type Supa = ReturnType<typeof getServiceClient>;

export interface BossGauntletRunRow {
  id: string;
  user_id: string;
  defeated_boss_slugs: string[];
  status: 'active' | 'champion';
  champion_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BossLadderStatus = 'locked' | 'current' | 'cleared';

export interface BossLadderEntry {
  slug: BossSlug;
  name: string;
  title: string;
  tier: BossDefinition['tier'];
  rarity: BossDefinition['rarity'];
  order: number;
  status: BossLadderStatus;
  solscanUrl: string | null;
}

export interface GauntletProgress {
  runId: string;
  defeatedCount: number;
  totalBosses: number;
  status: 'active' | 'champion';
  championAt: string | null;
  nextBossSlug: BossSlug | null;
  bosses: BossLadderEntry[];
}

export async function getOrCreateRun(supabase: Supa, userId: string): Promise<BossGauntletRunRow> {
  const { data: existing, error: fetchErr } = await supabase
    .from('boss_gauntlet_runs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (existing) return existing as BossGauntletRunRow;

  const { data: created, error: insertErr } = await supabase
    .from('boss_gauntlet_runs')
    .insert({ user_id: userId })
    .select('*')
    .single();
  if (insertErr) throw insertErr;
  return created as BossGauntletRunRow;
}

function buildLadder(defeated: string[], next: BossSlug | null): BossLadderEntry[] {
  return BOSS_ORDER.map((slug, index) => {
    const boss = BOSSES[slug];
    let status: BossLadderStatus = 'locked';
    if (defeated.includes(slug)) status = 'cleared';
    else if (slug === next) status = 'current';

    return {
      slug,
      name: boss.name,
      title: boss.title,
      tier: boss.tier,
      rarity: boss.rarity,
      order: index + 1,
      status,
      solscanUrl: boss.solscanUrl,
    };
  });
}

export async function getGauntletProgress(
  supabase: Supa,
  userId: string
): Promise<GauntletProgress> {
  const run = await getOrCreateRun(supabase, userId);
  const defeated = run.defeated_boss_slugs ?? [];
  const next = nextBossSlug(defeated);

  return {
    runId: run.id,
    defeatedCount: defeated.length,
    totalBosses: BOSS_ORDER.length,
    status: run.status,
    championAt: run.champion_at,
    nextBossSlug: next,
    bosses: buildLadder(defeated, next),
  };
}

export function assertCanFightBoss(run: BossGauntletRunRow, slug: string): void {
  if (!isBossSlug(slug)) throw new Error('Invalid boss slug.');
  if (run.status === 'champion') {
    throw new Error('You already cleared the gauntlet.');
  }
  const next = nextBossSlug(run.defeated_boss_slugs ?? []);
  if (next !== slug) {
    throw new Error('That boss is not unlocked yet.');
  }
}

export async function recordBossOutcome(
  supabase: Supa,
  user: UserRow,
  run: BossGauntletRunRow,
  bossSlug: BossSlug,
  battleId: string,
  challengerWon: boolean,
  isTie: boolean,
  basePoints: number
): Promise<{ pointsBefore: number; winStreak: number; becameChampion: boolean }> {
  const boss = getBossDefinition(bossSlug);
  if (!boss) throw new Error('Unknown boss.');

  let points = basePoints;
  if (challengerWon && !isTie && boss.winBonus) {
    points += boss.winBonus;
  }

  const { pointsBefore, winStreak } = await awardBattlePoints(
    supabase,
    user.id,
    points,
    isTie ? 'battle:tie' : challengerWon ? 'battle:win' : 'battle:loss',
    battleId,
    isTie ? undefined : challengerWon
  );

  if (challengerWon && !isTie) {
    await awardBattleQuests(supabase, user, true);

    const defeated = [...(run.defeated_boss_slugs ?? [])];
    if (!defeated.includes(bossSlug)) {
      defeated.push(bossSlug);
    }

    const becameChampion = defeated.length >= BOSS_ORDER.length;
    const updates: Partial<BossGauntletRunRow> = {
      defeated_boss_slugs: defeated,
      updated_at: new Date().toISOString(),
    };
    if (becameChampion) {
      updates.status = 'champion';
      updates.champion_at = new Date().toISOString();
    }

    await supabase.from('boss_gauntlet_runs').update(updates).eq('id', run.id);

    if (bossSlug === 'ansem') {
      const q = await getQuestBySlug(supabase, 'defeat-ansem');
      if (q) await recordCompletion(supabase, { user, quest: q });
    }
    if (becameChampion) {
      const q = await getQuestBySlug(supabase, 'boss-gauntlet-champion');
      if (q) await recordCompletion(supabase, { user, quest: q });
    }

    return { pointsBefore, winStreak, becameChampion };
  }

  return { pointsBefore, winStreak, becameChampion: false };
}

export { randomBossTaunt };
