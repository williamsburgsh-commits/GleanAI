import 'server-only';

import { Connection, PublicKey } from '@solana/web3.js';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  getQuestBySlug,
  recordCompletion,
  type UserRow,
} from '@/lib/quests.server';
import { getFighterByUserId, type FighterCardRow } from '@/lib/wallet-wars/fighter.server';
import { isBadgeTokenFrozen } from '@/lib/staking/fighterStake';
import {
  computePendingEpochs,
  getTrainingConfig,
  isCurrentlyStaked,
  powerForEpochs,
  restakeCooldownRemainingMs,
} from '@/lib/staking/training';

type Supa = ReturnType<typeof getServiceClient>;

export type StakeAction = 'stake' | 'unstake' | 'collect';

export interface TrainingStatus {
  badgeMint: string | null;
  staked: boolean;
  stakedAt: string | null;
  unstakedAt: string | null;
  epochsClaimed: number;
  trainingPowerBonus: number;
  pendingEpochs: number;
  pendingPower: number;
  restakeCooldownMs: number;
  epochSeconds: number;
  powerPerEpoch: number;
  fighterPower: number;
}

export function toTrainingStatus(fighter: FighterCardRow | null): TrainingStatus {
  const cfg = getTrainingConfig();
  if (!fighter) {
    return {
      badgeMint: null,
      staked: false,
      stakedAt: null,
      unstakedAt: null,
      epochsClaimed: 0,
      trainingPowerBonus: 0,
      pendingEpochs: 0,
      pendingPower: 0,
      restakeCooldownMs: 0,
      epochSeconds: cfg.epochSeconds,
      powerPerEpoch: cfg.powerPerEpoch,
      fighterPower: 0,
    };
  }

  const staked = isCurrentlyStaked(fighter);
  const { pendingEpochs } = computePendingEpochs({
    stakedAt: fighter.badge_staked_at,
    unstakedAt: staked ? null : fighter.badge_unstaked_at,
    epochsClaimed: fighter.training_epochs_claimed ?? 0,
  });

  return {
    badgeMint: fighter.badge_mint ?? null,
    staked,
    stakedAt: fighter.badge_staked_at ?? null,
    unstakedAt: fighter.badge_unstaked_at ?? null,
    epochsClaimed: fighter.training_epochs_claimed ?? 0,
    trainingPowerBonus: fighter.training_power_bonus ?? 0,
    pendingEpochs,
    pendingPower: powerForEpochs(pendingEpochs),
    restakeCooldownMs: staked
      ? 0
      : restakeCooldownRemainingMs({ unstakedAt: fighter.badge_unstaked_at }),
    epochSeconds: cfg.epochSeconds,
    powerPerEpoch: cfg.powerPerEpoch,
    fighterPower: fighter.power,
  };
}

export async function recordStakeEvent(
  supabase: Supa,
  params: {
    userId: string;
    mint: string;
    action: StakeAction;
    txSignature?: string | null;
    epochs?: number;
    powerDelta?: number;
  }
): Promise<void> {
  const { error } = await supabase.from('fighter_stake_events').insert({
    user_id: params.userId,
    mint: params.mint,
    action: params.action,
    tx_signature: params.txSignature ?? null,
    epochs: params.epochs ?? 0,
    power_delta: params.powerDelta ?? 0,
  });
  if (error && !error.message.includes('duplicate')) {
    console.warn('[staking] event insert', error.message);
  }
}

export async function markStaked(
  supabase: Supa,
  fighter: FighterCardRow,
  txSignature: string
): Promise<FighterCardRow> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('fighter_cards')
    .update({
      badge_staked_at: now,
      badge_unstaked_at: null,
      training_epochs_claimed: 0,
    })
    .eq('id', fighter.id)
    .select('*')
    .single();
  if (error) throw error;

  await recordStakeEvent(supabase, {
    userId: fighter.user_id,
    mint: fighter.badge_mint!,
    action: 'stake',
    txSignature,
  });

  return data as FighterCardRow;
}

/**
 * Align Supabase stake fields with on-chain ATA freeze.
 * Freeze is the source of truth for "is staked".
 * Heal paths do not award the stake quest.
 */
export async function reconcileStakeWithChain(params: {
  supabase: Supa;
  fighter: FighterCardRow;
  connection: Connection;
  owner: PublicKey;
}): Promise<{ fighter: FighterCardRow; status: TrainingStatus; healed: boolean }> {
  const { supabase, connection, owner } = params;
  let fighter = params.fighter;

  if (!fighter.badge_mint) {
    return { fighter, status: toTrainingStatus(fighter), healed: false };
  }

  const mint = new PublicKey(fighter.badge_mint);
  const frozen = await isBadgeTokenFrozen(connection, mint, owner);
  const dbStaked = isCurrentlyStaked(fighter);

  if (frozen && !dbStaked) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('fighter_cards')
      .update({
        badge_staked_at: now,
        badge_unstaked_at: null,
        training_epochs_claimed: fighter.training_epochs_claimed ?? 0,
      })
      .eq('id', fighter.id)
      .select('*')
      .single();
    if (error) {
      const msg = error.message || '';
      if (msg.includes('badge_staked_at') || msg.includes('column')) {
        throw new Error(
          'Staking columns missing — apply supabase migration 0012_fighter_staking.sql.'
        );
      }
      throw error;
    }
    fighter = data as FighterCardRow;
    await recordStakeEvent(supabase, {
      userId: fighter.user_id,
      mint: fighter.badge_mint!,
      action: 'stake',
      txSignature: null,
    });
    return { fighter, status: toTrainingStatus(fighter), healed: true };
  }

  if (!frozen && dbStaked) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('fighter_cards')
      .update({
        badge_unstaked_at: now,
      })
      .eq('id', fighter.id)
      .select('*')
      .single();
    if (error) {
      const msg = error.message || '';
      if (msg.includes('badge_unstaked_at') || msg.includes('column')) {
        throw new Error(
          'Staking columns missing — apply supabase migration 0012_fighter_staking.sql.'
        );
      }
      throw error;
    }
    fighter = data as FighterCardRow;
    await recordStakeEvent(supabase, {
      userId: fighter.user_id,
      mint: fighter.badge_mint!,
      action: 'unstake',
      txSignature: null,
    });
    return { fighter, status: toTrainingStatus(fighter), healed: true };
  }

  return { fighter, status: toTrainingStatus(fighter), healed: false };
}

export async function collectTraining(
  supabase: Supa,
  fighter: FighterCardRow
): Promise<{ epochs: number; powerDelta: number; fighter: FighterCardRow }> {
  const staked = isCurrentlyStaked(fighter);
  const { pendingEpochs } = computePendingEpochs({
    stakedAt: fighter.badge_staked_at,
    unstakedAt: staked ? null : fighter.badge_unstaked_at,
    epochsClaimed: fighter.training_epochs_claimed ?? 0,
  });
  if (pendingEpochs <= 0) {
    return { epochs: 0, powerDelta: 0, fighter };
  }

  const powerDelta = powerForEpochs(pendingEpochs);
  const newClaimed = (fighter.training_epochs_claimed ?? 0) + pendingEpochs;
  const newBonus = (fighter.training_power_bonus ?? 0) + powerDelta;
  const newPower = fighter.power + powerDelta;
  const newTotal =
    fighter.total_score - fighter.power + newPower;

  const { data, error } = await supabase
    .from('fighter_cards')
    .update({
      training_epochs_claimed: newClaimed,
      training_power_bonus: newBonus,
      power: newPower,
      total_score: newTotal,
    })
    .eq('id', fighter.id)
    .select('*')
    .single();
  if (error) throw error;

  await recordStakeEvent(supabase, {
    userId: fighter.user_id,
    mint: fighter.badge_mint || '',
    action: 'collect',
    epochs: pendingEpochs,
    powerDelta,
  });

  return { epochs: pendingEpochs, powerDelta, fighter: data as FighterCardRow };
}

export async function markUnstaked(
  supabase: Supa,
  fighter: FighterCardRow,
  txSignature: string
): Promise<{ fighter: FighterCardRow; collected: { epochs: number; powerDelta: number } }> {
  // Settle pending epochs before stopping accrual.
  const collected = await collectTraining(supabase, fighter);
  const latest =
    collected.fighter.id === fighter.id && collected.epochs >= 0
      ? collected.fighter
      : ((await getFighterByUserId(supabase, fighter.user_id)) as FighterCardRow);

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('fighter_cards')
    .update({
      badge_unstaked_at: now,
    })
    .eq('id', latest.id)
    .select('*')
    .single();
  if (error) throw error;

  await recordStakeEvent(supabase, {
    userId: latest.user_id,
    mint: latest.badge_mint!,
    action: 'unstake',
    txSignature,
  });

  return {
    fighter: data as FighterCardRow,
    collected: { epochs: collected.epochs, powerDelta: collected.powerDelta },
  };
}

export async function awardStakeQuest(
  supabase: Supa,
  user: UserRow,
  txSignature: string
): Promise<{ awarded: boolean; points: number }> {
  const quest = await getQuestBySlug(supabase, 'stake-fighter-badge');
  if (!quest) return { awarded: false, points: 0 };
  const { awarded } = await recordCompletion(supabase, {
    user,
    quest,
    txSignature,
  });
  return { awarded, points: awarded ? quest.points : 0 };
}
