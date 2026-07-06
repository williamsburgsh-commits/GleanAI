'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const STORAGE_KEY = 'glean.battle_sound';

interface BattleSoundApi {
  enabled: boolean;
  toggle: () => void;
  resume: () => Promise<void>;
  playStat: () => void;
  playClash: () => void;
  playShatter: () => void;
  playVictory: () => void;
}

const BattleSoundContext = createContext<BattleSoundApi | null>(null);

function useBattleSoundEngine(): BattleSoundApi {
  const [enabled, setEnabled] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setEnabled(stored !== '0');
  }, []);

  const getCtx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      ctxRef.current = new Ctx();
    }
    return ctxRef.current;
  }, []);

  const resume = useCallback(async () => {
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* optional */
      }
    }
  }, [getCtx]);

  const blip = useCallback(
    (freq: number, duration = 0.09, volume = 0.06) => {
      if (!enabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      void resume();
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.value = volume;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime;
        osc.start(t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.stop(t + duration);
      } catch {
        /* audio optional */
      }
    },
    [enabled, getCtx, resume]
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      if (next) void resume();
      return next;
    });
  }, [resume]);

  return useMemo(
    () => ({
      enabled,
      toggle,
      resume,
      playStat: () => blip(520, 0.07, 0.05),
      playClash: () => {
        blip(180, 0.12, 0.08);
        window.setTimeout(() => blip(240, 0.1, 0.07), 80);
      },
      playShatter: () => blip(120, 0.18, 0.07),
      playVictory: () => {
        blip(660, 0.1, 0.06);
        window.setTimeout(() => blip(880, 0.14, 0.06), 120);
      },
    }),
    [enabled, toggle, resume, blip]
  );
}

export function BattleSoundProvider({ children }: { children: React.ReactNode }) {
  const api = useBattleSoundEngine();
  return <BattleSoundContext.Provider value={api}>{children}</BattleSoundContext.Provider>;
}

export function useBattleSound() {
  const ctx = useContext(BattleSoundContext);
  if (!ctx) {
    throw new Error('useBattleSound must be used within BattleSoundProvider');
  }
  return ctx;
}

export function SoundToggle() {
  const { enabled, toggle } = useBattleSound();
  return (
    <button
      type="button"
      className="chip-btn text-[10px]"
      onClick={() => {
        toggle();
      }}
    >
      SFX {enabled ? 'ON' : 'OFF'}
    </button>
  );
}
