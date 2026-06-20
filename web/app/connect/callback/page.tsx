'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CrtPanel } from '@/components/CrtPanel';
import {
  decodeConnectRedirect,
  linkWalletToServer,
  rememberConnection,
} from '@/lib/phantom';

type Status = 'decrypting' | 'saving' | 'done' | 'error';

const STEP_TEXT: Record<Status, string> = {
  decrypting: 'DECRYPTING PHANTOM HANDSHAKE…',
  saving: 'LINKING WALLET TO PLAYER…',
  done: 'CONNECTED. LOADING ARCADE…',
  error: 'CONNECTION FAULT',
};

export default function ConnectCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('decrypting');
  const [wallet, setWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const search = new URLSearchParams(window.location.search);
        const result = decodeConnectRedirect(search);
        if (cancelled) return;
        rememberConnection(result);
        setWallet(result.walletAddress);

        setStatus('saving');
        await linkWalletToServer(result.walletAddress);

        if (cancelled) return;
        setStatus('done');
        setTimeout(() => router.replace('/play'), 1200);
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error.');
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <CrtPanel
        label="PHANTOM // HANDSHAKE"
        tone={status === 'error' ? 'magenta' : 'phosphor'}
      >
        <div className="space-y-4 py-4">
          <p
            className={`font-display text-[11px] leading-relaxed ${
              status === 'error' ? 'text-magenta glow-magenta' : 'text-phosphor glow-text'
            }`}
          >
            {STEP_TEXT[status]}
            {status !== 'done' && status !== 'error' ? (
              <span className="animate-blink"> _</span>
            ) : null}
          </p>

          {wallet ? (
            <p className="break-all rounded-sm border border-grid bg-slate/60 p-3 text-[11px] text-ash">
              <span className="text-cyan">WALLET:</span> {wallet}
            </p>
          ) : null}

          {error ? (
            <div className="space-y-3">
              <p className="text-xs text-magenta">{error}</p>
              <button
                className="arcade-btn"
                onClick={() => router.replace('/')}
              >
                ◂ Retry
              </button>
            </div>
          ) : null}
        </div>
      </CrtPanel>
    </main>
  );
}
