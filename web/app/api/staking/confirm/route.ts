import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getServiceClient } from '@/lib/supabaseServer';
import { getUserByTelegramIdFull, getFighterByUserId } from '@/lib/wallet-wars/fighter.server';
import { getConnection } from '@/lib/solana/connection';
import { normalizeCluster } from '@/lib/solana/cluster';
import { confirmSignature } from '@/lib/solana/confirmSignature';
import { isBadgeTokenFrozen } from '@/lib/staking/fighterStake';
import {
  awardStakeQuest,
  markStaked,
  markUnstaked,
  toTrainingStatus,
} from '@/lib/staking/staking.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/staking/confirm { telegramId, action: 'stake'|'unstake', txSignature }
export async function POST(request: Request) {
  let body: {
    telegramId?: string;
    action?: string;
    txSignature?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  const action = (body.action || '').toString().trim();
  const txSignature = (body.txSignature || '').toString().trim();

  if (!telegramId || !txSignature) {
    return NextResponse.json(
      { error: 'telegramId and txSignature are required.' },
      { status: 400 }
    );
  }
  if (action !== 'stake' && action !== 'unstake') {
    return NextResponse.json({ error: 'action must be stake or unstake.' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    const user = await getUserByTelegramIdFull(supabase, telegramId);
    if (!user?.wallet_address) {
      return NextResponse.json({ error: 'Wallet not linked.' }, { status: 400 });
    }

    const fighter = await getFighterByUserId(supabase, user.id);
    if (!fighter?.badge_mint) {
      return NextResponse.json({ error: 'No Fighter Badge linked.' }, { status: 400 });
    }

    const cluster = normalizeCluster(process.env.SOLANA_CLUSTER);
    const conn = getConnection({ cluster });

    try {
      await confirmSignature(conn, txSignature, { timeoutMs: 45_000, pollMs: 500 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('failed on-chain')) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      // Soft continue — tx may be confirmed but poll timed out.
    }

    const owner = new PublicKey(user.wallet_address);
    const mint = new PublicKey(fighter.badge_mint);
    const frozen = await isBadgeTokenFrozen(conn, mint, owner);

    if (action === 'stake') {
      if (!frozen) {
        return NextResponse.json(
          { error: 'On-chain badge is not frozen yet. Wait and retry Sync/Confirm.' },
          { status: 400 }
        );
      }
      const updated = await markStaked(supabase, fighter, txSignature);
      const quest = await awardStakeQuest(supabase, user, txSignature);
      return NextResponse.json({
        ok: true,
        action: 'stake',
        quest,
        status: toTrainingStatus(updated),
      });
    }

    if (frozen) {
      return NextResponse.json(
        { error: 'On-chain badge is still frozen. Wait and retry unstake confirm.' },
        { status: 400 }
      );
    }
    const { fighter: updated, collected } = await markUnstaked(
      supabase,
      fighter,
      txSignature
    );
    return NextResponse.json({
      ok: true,
      action: 'unstake',
      collected,
      status: toTrainingStatus(updated),
    });
  } catch (err) {
    console.error('[api/staking/confirm]', err);
    const message = err instanceof Error ? err.message : 'Confirm failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
