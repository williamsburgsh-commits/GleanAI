'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import { useTelegram } from '@/components/TelegramProvider';
import { getStoredWallet } from '@/lib/phantom';
import { MiniAppBottomNav, type MiniAppTab } from './MiniAppBottomNav';
import { PlayTab } from './PlayTab';
import { RankTab } from './RankTab';
import { InviteTab } from './InviteTab';

function parseTab(value: string | null): MiniAppTab {
  if (value === 'rank' || value === 'invite' || value === 'play') return value;
  return 'play';
}

function shorten(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function MiniAppShell() {
  const { player, loading, error, inTelegram, webApp, setWalletAddress } = useTelegram();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tab, setTab] = useState<MiniAppTab>(() => parseTab(searchParams.get('tab')));
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletLinked, setWalletLinked] = useState(false);

  const telegramId = player?.telegramId ?? null;
  const displayWallet = player?.walletAddress ?? wallet;

  const hapticSelection = useCallback(() => {
    try {
      webApp?.HapticFeedback?.selectionChanged();
    } catch {
      /* noop */
    }
  }, [webApp]);

  const haptic = useCallback(
    (type: 'success' | 'error' | 'warning') => {
      try {
        webApp?.HapticFeedback?.notificationOccurred(type);
      } catch {
        /* noop */
      }
    },
    [webApp]
  );

  useEffect(() => {
    setTab(parseTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    if (loading) return;
    setWallet(getStoredWallet());
    if (player?.walletAddress) setWalletLinked(true);
  }, [loading, player?.walletAddress]);

  function onTabChange(next: MiniAppTab) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'play') {
      params.delete('tab');
    } else {
      params.set('tab', next);
    }
    const qs = params.toString();
    router.replace(qs ? `/app?${qs}` : '/app', { scroll: false });
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <p className="text-center font-pixel text-[11px] text-phosphor glow-text">
          BOOTING GLEANAI<span className="animate-blink"> _</span>
        </p>
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <main className="flex flex-1 flex-col gap-4 px-3 py-4 pb-24">
        <header className="flex items-center justify-between">
          <BrandMark href="/app" />
          {walletLinked && displayWallet ? (
            <span className="crt-tag" style={{ borderColor: '#2bd9ff', color: '#2bd9ff' }}>
              {shorten(displayWallet)}
            </span>
          ) : (
            <span className="crt-tag" style={{ borderColor: '#ffb437', color: '#ffb437' }}>
              {inTelegram ? 'NO WALLET' : 'BROWSER'}
            </span>
          )}
        </header>

        {error ? (
          <p className="rounded-sm border-2 border-magenta bg-slate/40 p-3 font-term text-[17px] text-magenta">
            {error}
          </p>
        ) : null}

        {tab === 'play' ? (
          <PlayTab
            telegramId={telegramId}
            inTelegram={inTelegram}
            webApp={webApp}
            player={player}
            wallet={wallet}
            walletLinked={walletLinked}
            setWallet={setWallet}
            setWalletLinked={setWalletLinked}
            setWalletAddress={setWalletAddress}
            haptic={haptic}
            onOpenInvite={() => onTabChange('invite')}
          />
        ) : null}

        {tab === 'rank' ? <RankTab telegramId={telegramId} /> : null}

        {tab === 'invite' ? (
          <InviteTab telegramId={telegramId} webApp={webApp} haptic={haptic} />
        ) : null}

        <p className="text-center font-term text-[14px] uppercase tracking-[0.2em] text-ash">
          gleanai · speedrun your solana onboarding
        </p>
      </main>

      <MiniAppBottomNav active={tab} onChange={onTabChange} onHaptic={hapticSelection} />
    </div>
  );
}
