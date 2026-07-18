/** Wall-clock training epoch accrual for staked Fighter Badges. */

export function getTrainingConfig() {
  const epochSeconds = Math.max(
    60,
    Number(process.env.TRAINING_EPOCH_SECONDS?.trim() || '3600') || 3600
  );
  const powerPerEpoch = Math.max(
    1,
    Number(process.env.TRAINING_POWER_PER_EPOCH?.trim() || '2') || 2
  );
  const maxEpochsPerCollect = Math.max(
    1,
    Number(process.env.TRAINING_MAX_EPOCHS_PER_COLLECT?.trim() || '24') || 24
  );
  const restakeCooldownSeconds = Math.max(
    0,
    Number(process.env.TRAINING_RESTAKE_COOLDOWN_SECONDS?.trim() || '300') || 300
  );
  return { epochSeconds, powerPerEpoch, maxEpochsPerCollect, restakeCooldownSeconds };
}

export function isCurrentlyStaked(row: {
  badge_staked_at?: string | null;
  badge_unstaked_at?: string | null;
}): boolean {
  if (!row.badge_staked_at) return false;
  if (!row.badge_unstaked_at) return true;
  return new Date(row.badge_staked_at).getTime() > new Date(row.badge_unstaked_at).getTime();
}

export function computePendingEpochs(params: {
  stakedAt: string | null | undefined;
  unstakedAt?: string | null;
  epochsClaimed: number;
  now?: Date;
  epochSeconds?: number;
  maxEpochs?: number;
}): { pendingEpochs: number; accruedThrough: Date | null } {
  const cfg = getTrainingConfig();
  const epochSeconds = params.epochSeconds ?? cfg.epochSeconds;
  const maxEpochs = params.maxEpochs ?? cfg.maxEpochsPerCollect;
  const now = params.now ?? new Date();

  if (!params.stakedAt) {
    return { pendingEpochs: 0, accruedThrough: null };
  }

  const start = new Date(params.stakedAt).getTime();
  const end = params.unstakedAt
    ? Math.min(now.getTime(), new Date(params.unstakedAt).getTime())
    : now.getTime();
  if (end <= start) return { pendingEpochs: 0, accruedThrough: null };

  const totalEpochs = Math.floor((end - start) / (epochSeconds * 1000));
  const pending = Math.max(0, totalEpochs - (params.epochsClaimed || 0));
  const capped = Math.min(pending, maxEpochs);
  const accruedThrough =
    capped > 0
      ? new Date(start + (params.epochsClaimed + capped) * epochSeconds * 1000)
      : null;

  return { pendingEpochs: capped, accruedThrough };
}

export function powerForEpochs(epochs: number, powerPerEpoch?: number): number {
  const per = powerPerEpoch ?? getTrainingConfig().powerPerEpoch;
  return Math.max(0, epochs) * per;
}

export function restakeCooldownRemainingMs(params: {
  unstakedAt: string | null | undefined;
  now?: Date;
  cooldownSeconds?: number;
}): number {
  if (!params.unstakedAt) return 0;
  const cooldown =
    (params.cooldownSeconds ?? getTrainingConfig().restakeCooldownSeconds) * 1000;
  const unlockAt = new Date(params.unstakedAt).getTime() + cooldown;
  return Math.max(0, unlockAt - (params.now ?? new Date()).getTime());
}
