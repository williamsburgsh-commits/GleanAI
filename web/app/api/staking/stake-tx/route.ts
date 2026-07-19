import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getServiceClient } from '@/lib/supabaseServer';
import { getUserByTelegramIdFull, getFighterByUserId } from '@/lib/wallet-wars/fighter.server';
import { getConnection } from '@/lib/solana/connection';
import { normalizeCluster } from '@/lib/solana/cluster';
import {
  buildStakeTransaction,
  isBadgeTokenFrozen,
  serializeTxBase64,
} from '@/lib/staking/fighterStake';
import { reconcileStakeWithChain } from '@/lib/staking/staking.server';
import {
  isCurrentlyStaked,
  restakeCooldownRemainingMs,
} from '@/lib/staking/training';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/staking/stake-tx { telegramId }
export async function POST(request: Request) {
  let body: { telegramId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ error: 'telegramId is required.' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    const user = await getUserByTelegramIdFull(supabase, telegramId);
    if (!user?.wallet_address) {
      return NextResponse.json({ error: 'Wallet not linked.' }, { status: 400 });
    }

    const fighter = await getFighterByUserId(supabase, user.id);
    if (!fighter?.badge_mint) {
      return NextResponse.json(
        { error: 'Mint a Fighter Badge first.' },
        { status: 400 }
      );
    }

    const cluster = normalizeCluster(process.env.SOLANA_CLUSTER);
    const conn = getConnection({ cluster });
    const owner = new PublicKey(user.wallet_address);
    const mint = new PublicKey(fighter.badge_mint);

    const dbStaked = isCurrentlyStaked(fighter);
    const frozen = await isBadgeTokenFrozen(conn, mint, owner);

    if (dbStaked || frozen) {
      const { status } = await reconcileStakeWithChain({
        supabase,
        fighter,
        connection: conn,
        owner,
      });
      return NextResponse.json({
        alreadyStaked: true,
        status,
      });
    }

    const cooldown = restakeCooldownRemainingMs({
      unstakedAt: fighter.badge_unstaked_at,
    });
    if (cooldown > 0) {
      return NextResponse.json(
        {
          error: `Restake cooldown: wait ${Math.ceil(cooldown / 1000)}s.`,
          restakeCooldownMs: cooldown,
        },
        { status: 400 }
      );
    }

    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash(
      'confirmed'
    );

    const built = await buildStakeTransaction({
      connection: conn,
      owner,
      mint,
      blockhash,
      lastValidBlockHeight,
    });

    return NextResponse.json({
      transaction: serializeTxBase64(built.transaction),
      mint: built.mint,
      tokenAccount: built.tokenAccount,
      mode: built.mode,
      blockhash,
      lastValidBlockHeight,
      cluster,
    });
  } catch (err) {
    console.error('[api/staking/stake-tx]', err);
    const message = err instanceof Error ? err.message : 'Could not build stake tx.';
    // Race: token became frozen between checks — recover into staked UI.
    if (message.includes('already frozen')) {
      try {
        const supabase = getServiceClient();
        const user = await getUserByTelegramIdFull(supabase, telegramId);
        const fighter = user
          ? await getFighterByUserId(supabase, user.id)
          : null;
        if (user?.wallet_address && fighter?.badge_mint) {
          const cluster = normalizeCluster(process.env.SOLANA_CLUSTER);
          const conn = getConnection({ cluster });
          const { status } = await reconcileStakeWithChain({
            supabase,
            fighter,
            connection: conn,
            owner: new PublicKey(user.wallet_address),
          });
          return NextResponse.json({ alreadyStaked: true, status });
        }
      } catch (healErr) {
        console.warn('[api/staking/stake-tx] heal', healErr);
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
