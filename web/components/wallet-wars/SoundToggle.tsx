'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'glean.battle_sound';

export function useBattleSound() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  };

  const playBlip = () => {
    if (!enabled || typeof window === 'undefined') return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 440;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      /* audio optional */
    }
  };

  return { enabled, toggle, playBlip };
}

export function SoundToggle() {
  const { enabled, toggle } = useBattleSound();
  return (
    <button type="button" className="chip-btn text-[10px]" onClick={toggle}>
      SFX {enabled ? 'ON' : 'OFF'}
    </button>
  );
}
