/**
 * 10s GleanAI hero teaser — CRT arcade effects + COMING SOON end card + sound.
 *
 * Usage: npm run generate:hero-teaser --workspace web
 * Output: public/brand/gleanai-hero-teaser.mp4 (900×480)
 */

import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PNG } from 'pngjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/brand');
const HERO_STILL = path.join(OUT_DIR, 'teaser-stills/00-attract.png');
const AUDIO_DIR = path.join(ROOT, 'public/audio/battle');
const TMP_DIR = path.join(ROOT, '.tmp/hero-teaser-frames');

const OUT_W = 900;
const OUT_H = 480;
const FPS = 24;
const DURATION = 10;
const FRAME_COUNT = FPS * DURATION;
const HERO_END = 7;
const COMING_SOON_START = 7;

const C = {
  phosphor: [39, 255, 125],
  void: [10, 14, 21],
  black: [6, 8, 13],
};

// 5×7 pixel font — uppercase
const GLYPHS = {
  ' ': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  C: [0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0],
  O: [0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0],
  M: [1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
  I: [0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0],
  N: [1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
  G: [0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0],
  S: [0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0],
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/** Matches tailwind `flicker` keyframes (8s cycle) on the hero section. */
function flickerOpacity(t) {
  const p = (t % 8) / 8;
  if (p >= 0.91 && p < 0.92) return 0.7;
  if (p >= 0.96 && p < 0.97) return 0.85;
  return 1;
}

/** Matches `.coin-blink` — 1.1s steps(1). */
function coinBlinkOpacity(t) {
  return (t % 1.1) / 1.1 < 0.7 ? 1 : 0.25;
}

async function loadPng(filePath) {
  const raw = await readFile(filePath);
  return PNG.sync.read(raw);
}

function fillBackground(buf) {
  const cx = OUT_W * 0.5;
  const cy = OUT_H * 0.35;
  const maxR = Math.max(OUT_W, OUT_H) * 0.75;
  for (let y = 0; y < OUT_H; y++) {
    for (let x = 0; x < OUT_W; x++) {
      const i = (y * OUT_W + x) << 2;
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxR;
      const tint = Math.max(0, 1 - d) * 0.05;
      buf[i] = Math.round(C.void[0] + 39 * tint);
      buf[i + 1] = Math.round(C.void[1] + 255 * tint);
      buf[i + 2] = Math.round(C.void[2] + 125 * tint);
      buf[i + 3] = 255;
    }
  }
}

/** Hero still placement — returns { dx, dy, dw, dh } for region effects. */
function blitHero(buf, src, zoom = 1, yBias = 0.5) {
  const scale = (OUT_W / src.width) * zoom;
  const dw = Math.round(src.width * scale);
  const dh = Math.round(src.height * scale);
  const dx = Math.floor((OUT_W - dw) / 2);
  const dy = Math.floor(OUT_H * yBias - dh / 2);

  for (let y = 0; y < dh; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y / dh) * src.height));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x / dw) * src.width));
      const si = (sy * src.width + sx) << 2;
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || tx >= OUT_W || ty < 0 || ty >= OUT_H) continue;
      const di = (ty * OUT_W + tx) << 2;
      buf[di] = src.data[si];
      buf[di + 1] = src.data[si + 1];
      buf[di + 2] = src.data[si + 2];
      buf[di + 3] = 255;
    }
  }
  return { dx, dy, dw, dh };
}

function multiplyRegion(buf, x0, y0, w, h, factor) {
  for (let y = y0; y < y0 + h; y++) {
    if (y < 0 || y >= OUT_H) continue;
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || x >= OUT_W) continue;
      const i = (y * OUT_W + x) << 2;
      buf[i] = Math.round(buf[i] * factor);
      buf[i + 1] = Math.round(buf[i + 1] * factor);
      buf[i + 2] = Math.round(buf[i + 2] * factor);
    }
  }
}

function fillRect(buf, x0, y0, w, h, rgb, alpha = 255) {
  const a = alpha / 255;
  for (let y = y0; y < y0 + h; y++) {
    if (y < 0 || y >= OUT_H) continue;
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || x >= OUT_W) continue;
      const i = (y * OUT_W + x) << 2;
      if (a >= 0.99) {
        buf[i] = rgb[0];
        buf[i + 1] = rgb[1];
        buf[i + 2] = rgb[2];
      } else {
        buf[i] = Math.round(buf[i] * (1 - a) + rgb[0] * a);
        buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + rgb[1] * a);
        buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + rgb[2] * a);
      }
    }
  }
}

/** body::after scanlines — 4px repeating pattern. */
function applyGlobalScanlines(buf) {
  for (let y = 0; y < OUT_H; y++) {
    const lineDark = y % 4 === 3 ? 0.78 : 1;
    for (let x = 0; x < OUT_W; x++) {
      const i = (y * OUT_W + x) << 2;
      buf[i] = Math.round(buf[i] * lineDark);
      buf[i + 1] = Math.round(buf[i + 1] * lineDark);
      buf[i + 2] = Math.round(buf[i + 2] * lineDark);
    }
  }
}

/** .crt-roll drifting scan band (8s linear). */
function applyScanBand(buf, t) {
  const bandH = Math.round(OUT_H * 0.2);
  const progress = (t % 8) / 8;
  const bandY = lerp(-bandH * 0.5, OUT_H, progress);
  for (let y = 0; y < OUT_H; y++) {
    const rel = (y - bandY) / bandH;
    if (rel < 0 || rel > 1) continue;
    const boost = rel < 0.5 ? rel * 2 : (1 - rel) * 2;
    const add = boost * 0.025;
    for (let x = 0; x < OUT_W; x++) {
      const i = (y * OUT_W + x) << 2;
      buf[i] = Math.min(255, Math.round(buf[i] + 255 * add));
      buf[i + 1] = Math.min(255, Math.round(buf[i + 1] + 255 * add));
      buf[i + 2] = Math.min(255, Math.round(buf[i + 2] + 255 * add));
    }
  }
}

/** Inset vignette from body::after box-shadow. */
function applyVignette(buf) {
  const cx = OUT_W / 2;
  const cy = OUT_H / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < OUT_H; y++) {
    for (let x = 0; x < OUT_W; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxD;
      const edge = clamp((d - 0.35) / 0.65, 0, 1);
      const dark = 1 - edge * 0.55;
      const i = (y * OUT_W + x) << 2;
      buf[i] = Math.round(buf[i] * dark);
      buf[i + 1] = Math.round(buf[i + 1] * dark);
      buf[i + 2] = Math.round(buf[i + 2] * dark);
    }
  }
}

function drawGlyph(buf, glyph, x0, y0, scale, rgb) {
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (!glyph[row * 5 + col]) continue;
      fillRect(buf, x0 + col * scale, y0 + row * scale, scale, scale, rgb);
    }
  }
}

function measureText(text, scale, gap = scale) {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    if (i > 0) w += gap;
    w += 5 * scale;
  }
  return w;
}

function drawText(buf, text, cx, y, scale, rgb, showCursor) {
  const gap = scale;
  const cursorW = showCursor ? scale * 2 + gap : 0;
  const totalW = measureText(text, scale, gap) + cursorW;
  let x = Math.floor(cx - totalW / 2);

  for (const ch of text) {
    const g = GLYPHS[ch];
    if (g) drawGlyph(buf, g, x, y, scale, rgb);
    x += 5 * scale + gap;
  }

  if (showCursor) {
    fillRect(buf, x, y, scale * 2, 7 * scale, rgb);
  }
}

function renderFrame(t, hero) {
  const buf = new Uint8Array(OUT_W * OUT_H * 4);
  fillBackground(buf);

  if (t < HERO_END) {
    const zoom = lerp(1.0, 1.04, easeOutCubic(t / HERO_END));
    const placement = blitHero(buf, hero, zoom, 0.5);

    // animate-flicker on the whole hero block
    multiplyRegion(buf, placement.dx, placement.dy, placement.dw, placement.dh, flickerOpacity(t));

    // coin-blink on the "insert wallet" tagline (top ~18% of hero)
    const tagH = Math.max(8, Math.floor(placement.dh * 0.18));
    multiplyRegion(buf, placement.dx, placement.dy, placement.dw, tagH, coinBlinkOpacity(t));
  } else {
    // Coming soon scene — hero removed, CRT background only
    const textFade = easeOutCubic(clamp((t - COMING_SOON_START) / 0.5, 0, 1));
    const blinkOn = Math.floor(t * 2) % 2 === 0;
    const alpha = textFade;
    const col = [
      Math.round(C.phosphor[0] * alpha),
      Math.round(C.phosphor[1] * alpha),
      Math.round(C.phosphor[2] * alpha),
    ];
    drawText(buf, 'COMING SOON', OUT_W / 2, Math.floor(OUT_H * 0.5 - 3.5 * 5), 5, col, blinkOn && textFade > 0.5);
  }

  applyScanBand(buf, t);
  applyGlobalScanlines(buf);
  applyVignette(buf);

  return buf;
}

function rgbaToPng(rgba) {
  const png = new PNG({ width: OUT_W, height: OUT_H });
  png.data = Buffer.from(rgba);
  return PNG.sync.write(png);
}

function findFfmpeg() {
  try {
    const p = require('ffmpeg-static');
    if (p) return p;
  } catch {
    /* fall through */
  }
  return process.env.FFMPEG_PATH || 'ffmpeg';
}

function runFfmpeg(args) {
  const ffmpeg = findFfmpeg();
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    proc.stderr.on('data', (d) => {
      err += d.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${err.slice(-2000)}`));
    });
  });
}

async function buildSoundtrack(outPath) {
  const sampleRate = 22050;
  const total = sampleRate * DURATION;
  const mix = new Float32Array(total);

  async function loadWav(name) {
    const buf = await readFile(path.join(AUDIO_DIR, name));
    const samples = [];
    for (let i = 44; i + 1 < buf.length; i += 2) {
      samples.push(buf.readInt16LE(i) / 32768);
    }
    return samples;
  }

  function place(samples, startSec, gain = 1) {
    const start = Math.floor(startSec * sampleRate);
    for (let i = 0; i < samples.length && start + i < total; i++) {
      mix[start + i] += samples[i] * gain;
    }
  }

  const coin = await loadWav('coin.wav');
  const scan = await loadWav('scan-beep.wav');
  const whoosh = await loadWav('whoosh.wav');
  const fanfare = await loadWav('fanfare.wav');
  const flip = await loadWav('flip.wav');

  // Arcade attract — insert coin + ambient cabinet
  place(coin, 0.15, 0.85);
  place(flip, 0.55, 0.4);
  place(scan, 1.8, 0.35);
  place(scan, 3.6, 0.3);
  place(scan, 5.4, 0.28);
  place(coin, 6.2, 0.5);

  // Transition to coming soon
  place(whoosh, COMING_SOON_START, 0.7);
  place(fanfare, COMING_SOON_START + 0.15, 0.55);
  place(scan, COMING_SOON_START + 0.4, 0.45);
  place(coin, COMING_SOON_START + 0.6, 0.4);

  // Low CRT cabinet hum throughout
  for (let i = 0; i < total; i++) {
    const sec = i / sampleRate;
    const hum =
      Math.sin(2 * Math.PI * 55 * sec) * 0.022 +
      Math.sin(2 * Math.PI * 110 * sec) * 0.01;
    const gate = sec < HERO_END ? 0.5 : 0.35;
    mix[i] += hum * gate;
  }

  const pcm = Buffer.alloc(44 + total * 2);
  pcm.write('RIFF', 0);
  pcm.writeUInt32LE(36 + total * 2, 4);
  pcm.write('WAVE', 8);
  pcm.write('fmt ', 12);
  pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20);
  pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(sampleRate, 24);
  pcm.writeUInt32LE(sampleRate * 2, 28);
  pcm.writeUInt16LE(2, 32);
  pcm.writeUInt16LE(16, 34);
  pcm.write('data', 36);
  pcm.writeUInt32LE(total * 2, 40);
  for (let i = 0; i < total; i++) {
    const v = Math.max(-1, Math.min(1, mix[i]));
    pcm.writeInt16LE(Math.floor(v * 32767), 44 + i * 2);
  }
  await writeFile(outPath, pcm);
}

async function main() {
  console.log('Generating 10s GleanAI hero teaser…');
  await mkdir(OUT_DIR, { recursive: true });
  await rm(TMP_DIR, { recursive: true, force: true });
  await mkdir(TMP_DIR, { recursive: true });

  const hero = await loadPng(HERO_STILL);
  console.log(`  hero still: ${hero.width}×${hero.height}`);

  for (let f = 0; f < FRAME_COUNT; f++) {
    const t = f / FPS;
    const rgba = renderFrame(t, hero);
    const name = `frame_${String(f).padStart(4, '0')}.png`;
    await writeFile(path.join(TMP_DIR, name), rgbaToPng(rgba));
    if (f % 48 === 0) console.log(`  frames ${f}/${FRAME_COUNT}`);
  }
  console.log(`✓ ${FRAME_COUNT} frames @ ${OUT_W}×${OUT_H}`);

  const audioPath = path.join(TMP_DIR, 'hero-teaser-audio.wav');
  await buildSoundtrack(audioPath);
  console.log('✓ arcade soundtrack mixed');

  const outMp4 = path.join(OUT_DIR, 'gleanai-hero-teaser.mp4');
  const pattern = path.join(TMP_DIR, 'frame_%04d.png').replace(/\\/g, '/');
  const audioArg = audioPath.replace(/\\/g, '/');

  await runFfmpeg([
    '-y',
    '-framerate',
    String(FPS),
    '-i',
    pattern,
    '-i',
    audioArg,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    '-movflags',
    '+faststart',
    outMp4,
  ]);

  console.log(`✓ MP4 → ${outMp4}`);
  await rm(TMP_DIR, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
