'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/components/TelegramProvider';
import {
  buildConnectUrl,
  connectViaExtension,
  getPhantomProvider,
  getTelegramId,
  isMobileDevice,
  isTelegramMiniApp,
  linkWalletToServer,
  rememberConnectReturn,
  rememberConnection,
  type PhantomCluster,
} from '@/lib/phantom';

export function ConnectButton({
  cluster,
  label = 'Insert Wallet',
  returnPath,
}: {
  cluster: PhantomCluster;
  label?: string;
  /** Where to land after connect (browser path, e.g. /receipt). */
  returnPath?: string;
}) {
  const router = useRouter();
  const { inTelegram, webApp, player } = useTelegram();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setError(null);
    setBusy(true);

    try {
      // Telegram's in-app webview cannot run Phantom — open the real browser.
      if (inTelegram && webApp) {
        const origin = window.location.origin;
        const tg = player?.telegramId ?? getTelegramId() ?? '';
        const path = returnPath || window.location.pathname || '/';
        const qs = tg ? `?tg=${encodeURIComponent(tg)}` : '';
        webApp.openLink(`${origin}${path}${qs}`);
        setBusy(false);
        return;
      }

      // Desktop / browser: use the Phantom extension popup when available.
      if (getPhantomProvider()) {
        const result = await connectViaExtension();
        rememberConnection(result);
        await linkWalletToServer(result.walletAddress);
        router.push(returnPath || '/play');
        return;
      }

      // Mobile browser: deeplink into the Phantom app.
      if (isMobileDevice() || isTelegramMiniApp()) {
        const origin = window.location.origin;
        const dest = returnPath || '/play';
        rememberConnectReturn(dest);
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
        'Install the Phantom browser extension, or open GleanAI from Telegram on your phone with the Phantom app.'
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
      {inTelegram ? (
        <p className="max-w-xs text-center font-term text-[13px] text-ash">
          Opens in your phone browser — wallets can&apos;t run inside Telegram.
        </p>
      ) : null}
      {error ? (
        <p className="max-w-xs text-center text-xs text-magenta glow-magenta">
          {error}
        </p>
      ) : null}
    </div>
  );
}
