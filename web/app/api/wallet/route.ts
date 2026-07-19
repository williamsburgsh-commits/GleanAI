import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getServiceClient } from '@/lib/supabaseServer';
import { generateReferralCode } from '@/lib/referral';
import {
  addWebhookAddresses,
  removeWebhookAddresses,
} from '@/lib/helius/addresses.server';

export const runtime = 'nodejs';

function isValidSolanaAddress(address: string): boolean {
  try {
    // Throws if not a valid base58 ed25519 public key.
    // eslint-disable-next-line no-new
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

// GET /api/wallet?walletAddress=... — lookup which Telegram account owns a wallet.
export async function GET(request: Request) {
  const walletAddress = new URL(request.url).searchParams.get('walletAddress')?.trim() ?? '';
  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json(
      { error: 'A valid walletAddress query param is required.' },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[api/wallet] config error', err);
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('telegram_id, points')
      .eq('wallet_address', walletAddress)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ telegramId: null, points: 0 });
    }
    return NextResponse.json({
      telegramId: String(data.telegram_id),
      points: data.points ?? 0,
    });
  } catch (err) {
    console.error('[api/wallet] lookup error', err);
    return NextResponse.json(
      { error: 'Could not look up wallet.' },
      { status: 500 }
    );
  }
}

// POST /api/wallet  { telegramId, walletAddress }
// Links a connected Phantom wallet to the user's row (keyed by Telegram id).
export async function POST(request: Request) {
  let body: { telegramId?: string; walletAddress?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  const walletAddress = (body.walletAddress || '').toString().trim();

  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json(
      { error: 'A valid telegramId is required.' },
      { status: 400 }
    );
  }
  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json(
      { error: 'A valid Solana wallet address is required.' },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[api/wallet] config error', err);
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    // Guard: a wallet may only be linked to one account.
    const { data: walletOwner, error: ownerErr } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('wallet_address', walletAddress)
      .maybeSingle();
    if (ownerErr) throw ownerErr;
    if (walletOwner && String(walletOwner.telegram_id) !== telegramId) {
      return NextResponse.json(
        { error: 'This wallet is already linked to another account.' },
        { status: 409 }
      );
    }

    // Find or create the user for this Telegram id.
    const { data: existing, error: findErr } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .maybeSingle();
    if (findErr) throw findErr;

    if (existing) {
      const { error: updateErr } = await supabase
        .from('users')
        .update({ wallet_address: walletAddress })
        .eq('id', existing.id);
      if (updateErr) throw updateErr;

      const { processReferralMilestones } = await import('@/lib/points/referrals.server');
      await processReferralMilestones(supabase, existing.id);
    } else {
      // Web-first user (hasn't messaged the bot yet): create with a code.
      let created = false;
      for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
        const { error: insertErr } = await supabase.from('users').insert({
          telegram_id: telegramId,
          wallet_address: walletAddress,
          referral_code: generateReferralCode(),
        });
        if (!insertErr) {
          created = true;
        } else if (
          insertErr.code === '23505' &&
          /referral_code/.test(insertErr.message)
        ) {
          continue; // retry on referral_code collision
        } else {
          throw insertErr;
        }
      }
      if (!created) throw new Error('Could not create user (code collisions).');

      const { data: createdUser } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramId)
        .single();
      if (createdUser?.id) {
        const { processReferralMilestones } = await import('@/lib/points/referrals.server');
        await processReferralMilestones(supabase, createdUser.id);
      }
    }

    // Best-effort: watch this wallet for auto quest completion.
    void addWebhookAddresses([walletAddress]);

    return NextResponse.json({ ok: true, walletAddress });
  } catch (err) {
    console.error('[api/wallet] supabase error', err);
    return NextResponse.json(
      { error: 'Could not save your wallet. Please try again.' },
      { status: 500 }
    );
  }
}

// DELETE /api/wallet  { telegramId }
// Clears the linked wallet so the user can connect a different one.
export async function DELETE(request: Request) {
  let body: { telegramId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json(
      { error: 'A valid telegramId is required.' },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[api/wallet] config error', err);
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const { data: user, error: findErr } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('telegram_id', telegramId)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    if (!user.wallet_address) {
      return NextResponse.json({ ok: true, unlinked: false });
    }

    const previousWallet = user.wallet_address as string;

    const { error: updateErr } = await supabase
      .from('users')
      .update({ wallet_address: null })
      .eq('id', user.id);
    if (updateErr) throw updateErr;

    void removeWebhookAddresses([previousWallet]);

    return NextResponse.json({ ok: true, unlinked: true });
  } catch (err) {
    console.error('[api/wallet] unlink error', err);
    return NextResponse.json(
      { error: 'Could not disconnect wallet.' },
      { status: 500 }
    );
  }
}
