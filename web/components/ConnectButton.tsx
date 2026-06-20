'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  buildConnectUrl,
  connectViaExtension,
  getPhantomProvider,
  isMobileDevice,
  linkWalletToServer,
  rememberConnection,
  type PhantomCluster,
} from '@/lib/phantom';

export function ConnectButton({
  cluster,
  label = 'Insert Wallet',
}: {
  cluster: PhantomCluster;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setError(null);
    setBusy(true);

    try {
      // Desktop / browser: use the Phantom extension popup when available.
      if (getPhantomProvider()) {
        const result = await connectViaExtension();
        rememberConnection(result);
        await linkWalletToServer(result.walletAddress);
        router.push('/play');
        return;
      }

      // Mobile: deeplink into the Phantom app.
      if (isMobileDevice()) {
        const origin = window.location.origin;
        window.location.href = buildConnectUrl({
          cluster,
          appUrl: origin,
          redirectLink: `${origin}/connect/callback`,
        });
        return;
      }

      // Desktop without extension: avoid dumping users on phantom.app.
      setBusy(false);
      setError(
        'Install the Phantom browser extension, or open this page on your phone with the Phantom app.'
      );
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'Could not start connect.');
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button className="arcade-btn" onClick={connect} disabled={busy}>
        <span className="text-magenta">▸</span>
        {busy ? 'Connecting…' : label}
        <span className="animate-blink">_</span>
      </button>
      {error ? (
        <p className="max-w-xs text-center text-xs text-magenta glow-magenta">
          {error}
        </p>
      ) : null}
    </div>
  );
}
