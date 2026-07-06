import { Howl } from 'howler';

export type BattleSoundId =
  | 'whoosh'
  | 'thud'
  | 'flip'
  | 'scan-beep'
  | 'stat-win'
  | 'stat-loss'
  | 'critical'
  | 'boom'
  | 'fanfare'
  | 'defeat'
  | 'coin'
  | 'silence';

const SOUND_FILES: Record<BattleSoundId, string> = {
  whoosh: '/audio/battle/whoosh.wav',
  thud: '/audio/battle/thud.wav',
  flip: '/audio/battle/flip.wav',
  'scan-beep': '/audio/battle/scan-beep.wav',
  'stat-win': '/audio/battle/stat-win.wav',
  'stat-loss': '/audio/battle/stat-loss.wav',
  critical: '/audio/battle/critical.wav',
  boom: '/audio/battle/boom.wav',
  fanfare: '/audio/battle/fanfare.wav',
  defeat: '/audio/battle/defeat.wav',
  coin: '/audio/battle/coin.wav',
  silence: '/audio/battle/silence.wav',
};

let sounds: Partial<Record<BattleSoundId, Howl>> | null = null;
let muted = false;
let volume = 0.7;
let unlocked = false;

function loadSounds() {
  if (sounds || typeof window === 'undefined') return;
  sounds = {};
  for (const [id, src] of Object.entries(SOUND_FILES) as [BattleSoundId, string][]) {
    sounds[id] = new Howl({
      src: [src],
      volume,
      preload: true,
      html5: false,
    });
  }
}

export function setBattleAudioMuted(m: boolean) {
  muted = m;
  if (sounds) {
    for (const h of Object.values(sounds)) {
      h?.mute(m);
    }
  }
}

export function setBattleAudioVolume(v: number) {
  volume = v;
  if (sounds) {
    for (const h of Object.values(sounds)) {
      h?.volume(v);
    }
  }
}

export async function unlockBattleAudio(): Promise<void> {
  if (typeof window === 'undefined') return;
  loadSounds();
  if (unlocked) return;
  unlocked = true;
  try {
    const ctx = Howler.ctx;
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch {
    /* optional */
  }
}

export function playBattleSound(id: BattleSoundId) {
  if (muted || typeof window === 'undefined') return;
  loadSounds();
  void unlockBattleAudio();
  sounds?.[id]?.play();
}

export function preloadBattleSounds() {
  loadSounds();
}
