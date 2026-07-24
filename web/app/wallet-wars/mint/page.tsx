'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Connection, PublicKey } from '@solana/web3.js';
import { CrtPanel } from '@/components/CrtPanel';
import { useTelegram } from '@/components/TelegramProvider';
import { getPhantomProvider, getStoredWallet, getTelegramId } from '@/lib/phantom';
import { getPublicConfig } from '@/lib/config';
import { buildFighterBadgeMintTransaction, getBadgeMetadataUri } from '@/lib/mint/fighterBadge';
import { PixelArrowLeft } from '@/components/PixelArt';
import { GLEAN_BADGE_NAME } from '@/lib/solana/programs';
import {
  serializeTransactionBase64,
  walletErrorMessage,
} from '@/lib/solana/walletErrors';

export default function MintBadgePage() {
  const { inTelegram } = useTelegram();
  const { cluster } = getPublicConfig();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [rarityName, setRarityName] = useState<string | null>(null);

  useEffect(() => {
    const wallet = getStoredWallet();
    if (!wallet) {
      setReady(false);
      return;
    }
    const origin =
      (typeof window !== 'undefined' &&
        (process.env.NEXT_PUBLIC_WEB_APP_URL?.replace(/\/$/, '') ||
          window.location.origin)) ||
      '';
    fetch(`${origin}/api/badge-metadata?wallet=${encodeURIComponent(wallet)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) {
          setReady(false);
          return;
        }
        const data = await res.json();
        setRarityName(typeof data.name === 'string' ? data.name : null);
        setReady(true);
      })
      .catch(() => setReady(false));
  }, []);

  const syncMint = async () => {
    const tg = getTelegramId();
    if (!tg) {
      setError('Connect Phantom and sign in first.');
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch('/api/mint/fighter-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: tg, sync: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not sync badge from wallet history.');
      }
      setMsg(data.detail || 'Badge linked!');
      setReady(true);
    } catch (e) {
      setError(walletErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const mint = async () => {
    const wallet = getStoredWallet();
    const tg = getTelegramId();
    const provider = getPhantomProvider();
    if (!wallet || !tg || !provider) {
      setError('Connect Phantom and sign in first.');
      return;
    }

    setBusy(true);
    setError(null);
    setMsg(null);

    try {
      const origin =
        process.env.NEXT_PUBLIC_WEB_APP_URL?.replace(/\/$/, '') ||
        window.location.origin;

      const metaRes = await fetch(
        `${origin}/api/badge-metadata?wallet=${encodeURIComponent(wallet)}`,
        { cache: 'no-store' }
      );
      const metaBody = await metaRes.json().catch(() => ({}));
      if (!metaRes.ok) {
        throw new Error(
          metaBody.error || 'Scan your fighter in Wallet Wars before minting.'
        );
      }

      const bhRes = await fetch('/api/solana/blockhash', { cache: 'no-store' });
      const bhBody = await bhRes.json();
      if (!bhRes.ok) {
        throw new Error(bhBody.error || 'Could not fetch blockhash.');
      }
      const { blockhash, lastValidBlockHeight, cluster: serverCluster } = bhBody as {
        blockhash: string;
        lastValidBlockHeight: number;
        cluster?: string;
      };
      const rpcCluster =
        serverCluster === 'mainnet-beta' || serverCluster === 'mainnet'
          ? 'mainnet-beta'
          : 'devnet';

      // Endpoint only seeds Umi program registry — no browser RPC calls for blockhash.
      const connection = new Connection(
        rpcCluster === 'mainnet-beta'
          ? 'https://api.mainnet-beta.solana.com'
          : 'https://api.devnet.solana.com',
        'confirmed'
      );
      const payer = new PublicKey(wallet);
      const metadataUri = getBadgeMetadataUri(origin, wallet);
      // Keep on-chain name short; full rarity name lives in off-chain JSON.
      const onChainName = GLEAN_BADGE_NAME;

      const { transaction, mint: mintPk } = await buildFighterBadgeMintTransaction({
        connection,
        payer,
        metadataUri,
        name: onChainName,
        blockhash,
        lastValidBlockHeight,
      });

      // Multi-signer mint: Phantom signs only; Alchemy broadcasts (avoids public RPC 403 / Unexpected error).
      if (typeof provider.signTransaction !== 'function') {
        throw new Error('Phantom signTransaction is unavailable. Update Phantom and retry.');
      }
      const signed = await provider.signTransaction(transaction);
      const sendRes = await fetch('/api/solana/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: serializeTransactionBase64(signed) }),
      });
      const sendBody = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) {
        throw new Error(sendBody.error || 'Could not broadcast mint transaction.');
      }
      const signature = String(sendBody.signature);

      // Confirm is best-effort — NFT may already be in the wallet if RPC is slow.
      const confirmRes = await fetch('/api/claims/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, blockhash, lastValidBlockHeight }),
      });
      const confirmBody = await confirmRes.json().catch(() => ({}));
      const confirmHardFail =
        confirmRes.status >= 400 &&
        confirmRes.status !== 202 &&
        !confirmBody.pending;

      // Always try to record mint + quest even if confirm timed out.
      let data: {
        detail?: string;
        error?: string;
        awarded?: boolean;
        mintAddress?: string | null;
      } = {};
      let verifyOk = false;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
        const res = await fetch('/api/mint/fighter-badge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: tg,
            txSignature: signature,
            mintAddress: mintPk.toBase58(),
          }),
        });
        data = await res.json().catch(() => ({}));
        if (res.ok) {
          verifyOk = true;
          break;
        }
      }

      if (!verifyOk) {
        if (confirmHardFail) {
          throw new Error(confirmBody.error || 'Transaction sent but confirmation failed.');
        }
        throw new Error(
          data.error ||
            `Mint likely succeeded (${signature.slice(0, 8)}…) but site verify lagged. Refresh Wallet Wars in a moment, or retry verify.`
        );
      }

      setMsg(data.detail || 'Badge minted!');
      setReady(true);
    } catch (e) {
      setError(walletErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Link href="/wallet-wars" className="mb-4 inline-flex items-center gap-2 font-pixel text-[9px] text-cyan">
        <span className="inline-block h-4 w-4">
          <PixelArrowLeft />
        </span>
        BACK
      </Link>

      <CrtPanel label="MINT FIGHTER BADGE" tone="amber">
        <p className="mb-4 font-term text-sm">
          Mint your official Glean Fighter Badge NFT on {cluster}. Metaplex metadata embeds
          your scanned stats. Completing this quest boosts POWER on your fighter card.
        </p>
        <p className="mb-4 font-term text-xs text-ash">
          Needs ~0.02+ Devnet SOL for rent (metadata + mint accounts). Airdrop in Phantom if
          your balance is low.
        </p>
        {ready === false ? (
          <p className="mb-4 font-term text-sm text-amber">
            Scan your fighter in Wallet Wars first — badge metadata is built from your card.
          </p>
        ) : null}
        {rarityName ? (
          <p className="mb-3 font-term text-sm text-phosphor">{rarityName}</p>
        ) : null}
        {error && <p className="mb-2 font-term text-magenta">{error}</p>}
        {msg && <p className="mb-2 font-term text-phosphor">{msg}</p>}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="arcade-btn"
            disabled={busy || ready === false}
            onClick={mint}
          >
            {busy ? 'WORKING…' : 'MINT BADGE NFT'}
          </button>
          <button
            type="button"
            className="arcade-btn-cyan"
            disabled={busy}
            onClick={syncMint}
            title="Use if the NFT is already in Phantom but the site did not update"
          >
            SYNC FROM WALLET
          </button>
        </div>
        <p className="mt-3 font-term text-xs text-ash">
          Already minted but the site said it failed? Tap Sync — it links the NFT from your
          wallet history without minting again.
        </p>
      </CrtPanel>

      {inTelegram && (
        <p className="mt-4 font-term text-xs text-ash">
          Open in external browser with Phantom connected if mint fails in Telegram.
        </p>
      )}
    </main>
  );
}
