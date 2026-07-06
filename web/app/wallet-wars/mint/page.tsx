'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
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
      const endpoint =
        cluster === 'devnet'
          ? clusterApiUrl('devnet')
          : clusterApiUrl('mainnet-beta');
      const connection = new Connection(endpoint, 'confirmed');
      const payer = new PublicKey(wallet);

      const metadataUri = getBadgeMetadataUri(window.location.origin, wallet);
      const { transaction } = await buildFighterBadgeMintTransaction({
        connection,
        payer,
        metadataUri,
      });

      const { signature } = await provider.signAndSendTransaction(transaction);

      const res = await fetch('/api/mint/fighter-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: tg, txSignature: signature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setMsg(data.detail || 'Badge minted!');
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
          Mint your official Glean Fighter Badge on {cluster}. Completing this quest boosts
          POWER on your fighter card.
        </p>
        {error && <p className="mb-2 font-term text-magenta">{error}</p>}
        {msg && <p className="mb-2 font-term text-phosphor">{msg}</p>}
        <button type="button" className="arcade-btn" disabled={busy} onClick={mint}>
          {busy ? 'MINTING…' : 'MINT BADGE'}
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
