#!/usr/bin/env node
/** Generates minimal 8-bit WAV placeholders for Wallet Wars battle SFX. */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/audio/battle');
mkdirSync(outDir, { recursive: true });

function wav(freq, ms, volume = 0.3, type = 'square') {
  const sampleRate = 22050;
  const n = Math.floor((sampleRate * ms) / 1000);
  const data = Buffer.alloc(44 + n * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + n * 2, 4);
  data.write('WAVE', 8);
  data.write('fmt ', 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24);
  data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, (n - i) / (n * 0.3));
    let s = 0;
    if (type === 'square') {
      s = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
    } else {
      s = Math.sin(2 * Math.PI * freq * t);
    }
    const v = Math.max(-1, Math.min(1, s * volume * env));
    data.writeInt16LE(Math.floor(v * 32767), 44 + i * 2);
  }
  return data;
}

const sounds = {
  whoosh: wav(200, 180, 0.2, 'sine'),
  thud: wav(80, 120, 0.45, 'square'),
  flip: wav(600, 90, 0.25, 'square'),
  'scan-beep': wav(880, 60, 0.2, 'square'),
  'stat-win': wav(660, 100, 0.25, 'square'),
  'stat-loss': wav(220, 140, 0.3, 'square'),
  critical: wav(1200, 80, 0.3, 'square'),
  boom: wav(60, 200, 0.5, 'square'),
  fanfare: wav(523, 300, 0.25, 'square'),
  defeat: wav(180, 350, 0.3, 'sine'),
  coin: wav(988, 80, 0.2, 'square'),
  silence: wav(0, 50, 0, 'sine'),
};

for (const [name, buf] of Object.entries(sounds)) {
  writeFileSync(join(outDir, `${name}.wav`), buf);
  console.log('wrote', name);
}
