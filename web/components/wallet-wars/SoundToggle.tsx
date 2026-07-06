'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  playBattleSound,
  preloadBattleSounds,
  setBattleAudioMuted,
  unlockBattleAudio,
  type BattleSoundId,
} from '@/lib/wallet-wars/battleAudio';

const STORAGE_KEY = 'glean.battle_sound';

interface BattleSoundApi {
  enabled: boolean;
  toggle: () => void;
  resume: () => Promise<void>;
  play: (id: BattleSoundId) => void;
  playStat: () => void;
  playClash: () => void;
  playShatter: () => void;
  playVictory: () => void;
}

const BattleSoundContext = createContext<BattleSoundApi | null>(null);

function useBattleSoundEngine(): BattleSoundApi {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setEnabled(stored !== '0');
    preloadBattleSounds();
    setBattleAudioMuted(stored === '0');
  }, []);

  const resume = useCallback(async () => {
    await unlockBattleAudio();
  }, []);

  const play = useCallback((id: BattleSoundId) => {
    playBattleSound(id);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      setBattleAudioMuted(!next);
      if (next) void unlockBattleAudio();
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      enabled,
      toggle,
      resume,
      play,
      playStat: () => play('scan-beep'),
      playClash: () => {
        play('stat-win');
      },
      playShatter: () => play('defeat'),
      playVictory: () => play('fanfare'),
    }),
    [enabled, toggle, resume, play]
  );
}

export function BattleSoundProvider({ children }: { children: React.ReactNode }) {
  const api = useBattleSoundEngine();
  return <BattleSoundContext.Provider value={api}>{children}</BattleSoundContext.Provider>;
}

export function useBattleSound() {
  const ctx = useContext(BattleSoundContext);
  if (!ctx) throw new Error('useBattleSound must be used within BattleSoundProvider');
  return ctx;
}

export function SoundToggle() {
  const { enabled, toggle } = useBattleSound();
  return (
    <button type="button" className="chip-btn text-[10px]" onClick={toggle}>
      SFX {enabled ? 'ON' : 'OFF'}
    </button>
  );
}
