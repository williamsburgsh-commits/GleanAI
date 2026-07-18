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
      const { blockhash, lastValidBlockHeight } = bhBody as {
        blockhash: string;
        lastValidBlockHeight: number;
      };

      // Endpoint only seeds Umi program registry — no browser RPC calls for blockhash.
      const connection = new Connection(
        cluster === 'mainnet-beta'
          ? 'https://api.mainnet-beta.solana.com'
          : 'https://api.devnet.solana.com',
        'confirmed'
      );
      const payer = new PublicKey(wallet);
      const metadataUri = getBadgeMetadataUri(origin, wallet);
      const onChainName = String(metaBody.name || 'Glean Fighter Badge').slice(0, 32);

      const { transaction, mint: mintPk } = await buildFighterBadgeMintTransaction({
        connection,
        payer,
        metadataUri,
        name: onChainName,
        blockhash,
        lastValidBlockHeight,
      });

      const { signature } = await provider.signAndSendTransaction(transaction);

      const confirmRes = await fetch('/api/claims/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, blockhash, lastValidBlockHeight }),
      });
      const confirmBody = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok) {
        throw new Error(confirmBody.error || 'Transaction sent but confirmation failed.');
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setMsg(data.detail || 'Badge minted!');
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mint failed');
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
        <button
          type="button"
          className="arcade-btn"
          disabled={busy || ready === false}
          onClick={mint}
        >
          {busy ? 'MINTING…' : 'MINT BADGE NFT'}
        </button>
      </CrtPanel>

      {inTelegram && (
        <p className="mt-4 font-term text-xs text-ash">
          Open in external browser with Phantom connected if mint fails in Telegram.
        </p>
      )}
    </main>
  );
}
