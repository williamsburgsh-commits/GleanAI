'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { rememberTelegramId, getTelegramId } from '@/lib/phantom';
import type { TelegramWebApp } from '@/types/telegram';

export interface Player {
  telegramId: string;
  username: string | null;
  firstName: string | null;
  walletAddress: string | null;
  points: number;
}

interface TelegramContextValue {
  player: Player | null;
  loading: boolean;
  error: string | null;
  inTelegram: boolean;
  webApp: TelegramWebApp | null;
  setWalletAddress: (addr: string | null) => void;
  setPoints: (points: number) => void;
}

const TelegramContext = createContext<TelegramContextValue>({
  player: null,
  loading: true,
  error: null,
  inTelegram: false,
  webApp: null,
  setWalletAddress: () => {},
  setPoints: () => {},
});

export function useTelegram() {
  return useContext(TelegramContext);
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inTelegram, setInTelegram] = useState(false);
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  const setWalletAddress = useCallback((addr: string | null) => {
    setPlayer((p) => (p ? { ...p, walletAddress: addr } : p));
  }, []);
  const setPoints = useCallback((points: number) => {
    setPlayer((p) => (p ? { ...p, points } : p));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const wa = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

      // Inside Telegram: initialize the native shell + verify the session.
      if (wa && wa.initData) {
        setWebApp(wa);
        setInTelegram(true);
        try {
          wa.ready();
          wa.expand();
          wa.setHeaderColor('#05060a');
          wa.setBackgroundColor('#05060a');
        } catch {
          /* older clients may not support all methods */
        }

        try {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: wa.initData }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Sign-in failed.');
          if (cancelled) return;
          rememberTelegramId(data.player.telegramId);
          setPlayer(data.player as Player);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Sign-in failed.');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      // Plain browser fallback: use ?tg= (legacy bot link) if present.
      // Skip ?tg= on battle invites — that param is the creator's id, not the visitor's.
      const params = new URLSearchParams(window.location.search);
      const isBattleInvite = Boolean(params.get('invite'));
      const tgParam = isBattleInvite ? null : params.get('tg');
      const tg = tgParam && /^\d+$/.test(tgParam) ? tgParam : getTelegramId();
      if (tg) {
        if (tgParam) rememberTelegramId(tg);
        setPlayer({
          telegramId: tg,
          username: null,
          firstName: null,
          walletAddress: null,
          points: 0,
        });
      }
      if (!cancelled) setLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TelegramContext.Provider
      value={{
        player,
        loading,
        error,
        inTelegram,
        webApp,
        setWalletAddress,
        setPoints,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}
