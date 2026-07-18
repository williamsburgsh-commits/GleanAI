/**
 * 15s GleanAI teaser from real Telegram screenshots.
 *
 * Stills (public/brand/teaser-stills/):
 *   01-play.png      → Telegram chat + Play GleanAI
 *   02-booting.png   → BOOTING GLEANAI
 *   03-gauntlet.png  → Boss list + Fight The Gatekeeper
 *   04-battle.png    → Boss Gauntlet // Battle
 *
 * Usage: npm run generate:teaser --workspace web
 * Output: public/brand/gleanai-teaser.mp4 (1080×1920)
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
const STILL_DIR = path.join(OUT_DIR, 'teaser-stills');
const AUDIO_DIR = path.join(ROOT, 'public/audio/battle');
const TMP_DIR = path.join(ROOT, '.tmp/teaser-frames');
const WORDMARK_PATH = path.join(OUT_DIR, 'gleanai-wordmark-pfp.png');

const OUT_W = 1080;
const OUT_H = 1920;
const FPS = 12;
const DURATION = 15;
const FRAME_COUNT = FPS * DURATION;

const C = {
  phosphor: [0, 255, 136],
  cyan: [0, 255, 136],
  magenta: [255, 45, 120],
  amber: [255, 255, 255],
  black: [10, 10, 10],
  bone: [255, 255, 255],
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

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

async function loadPng(filePath) {
  const raw = await readFile(filePath);
  return PNG.sync.read(raw);
}

/** Sample source PNG with cover-fit + Ken Burns zoom/pan into 1080×1920. */
function sampleCover(src, dx, dy, zoom) {
  const sw = src.width;
  const sh = src.height;
  const targetAspect = OUT_W / OUT_H;
  const srcAspect = sw / sh;

  let cropW;
  let cropH;
  if (srcAspect > targetAspect) {
    cropH = sh / zoom;
    cropW = cropH * targetAspect;
  } else {
    cropW = sw / zoom;
    cropH = cropW / targetAspect;
  }

  const maxX = Math.max(0, sw - cropW);
  const maxY = Math.max(0, sh - cropH);
  const ox = clamp(dx, 0, 1) * maxX;
  const oy = clamp(dy, 0, 1) * maxY;

  const rgba = new Uint8Array(OUT_W * OUT_H * 4);
  for (let y = 0; y < OUT_H; y++) {
    const sy = Math.min(sh - 1, Math.floor(oy + (y / (OUT_H - 1)) * (cropH - 1)));
    for (let x = 0; x < OUT_W; x++) {
      const sx = Math.min(sw - 1, Math.floor(ox + (x / (OUT_W - 1)) * (cropW - 1)));
      const si = (sy * sw + sx) << 2;
      const di = (y * OUT_W + x) << 2;
      rgba[di] = src.data[si];
      rgba[di + 1] = src.data[si + 1];
      rgba[di + 2] = src.data[si + 2];
      rgba[di + 3] = 255;
    }
  }
  return rgba;
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
        buf[i + 3] = 255;
      } else {
        buf[i] = Math.round(buf[i] * (1 - a) + rgb[0] * a);
        buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + rgb[1] * a);
        buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + rgb[2] * a);
      }
    }
  }
}

function applyScanlines(buf, strength = 0.18) {
  for (let y = 0; y < OUT_H; y += 2) {
    for (let x = 0; x < OUT_W; x++) {
      const i = (y * OUT_W + x) << 2;
      buf[i] = Math.round(buf[i] * (1 - strength));
      buf[i + 1] = Math.round(buf[i + 1] * (1 - strength));
      buf[i + 2] = Math.round(buf[i + 2] * (1 - strength));
    }
  }
}

function applyVignette(buf, amount = 0.35) {
  const cx = OUT_W / 2;
  const cy = OUT_H / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < OUT_H; y++) {
    for (let x = 0; x < OUT_W; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxD;
      const dark = 1 - amount * Math.max(0, d - 0.45) ** 1.6;
      const i = (y * OUT_W + x) << 2;
      buf[i] = Math.round(buf[i] * dark);
      buf[i + 1] = Math.round(buf[i + 1] * dark);
      buf[i + 2] = Math.round(buf[i + 2] * dark);
    }
  }
}

function flashOverlay(buf, rgb, alpha) {
  if (alpha <= 0) return;
  fillRect(buf, 0, 0, OUT_W, OUT_H, rgb, Math.floor(alpha * 255));
}

function drawCursor(buf, x, y, pressed) {
  const size = pressed ? 42 : 52;
  const col = pressed ? C.amber : C.bone;
  // simple pixel finger / pointer
  fillRect(buf, x, y, size, Math.floor(size * 1.35), col, 230);
  fillRect(buf, x + 8, y - 18, size - 16, 22, col, 230);
  fillRect(buf, x + 6, y + Math.floor(size * 1.35), size - 12, 28, [120, 130, 140], 220);
}

function blitWordmark(buf, wordmark, alpha = 1) {
  if (!wordmark || alpha <= 0) return;
  const tw = 720;
  const th = 280;
  const dx = Math.floor((OUT_W - tw) / 2);
  const dy = Math.floor(OUT_H * 0.38);
  const a = clamp(alpha, 0, 1);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const sx = Math.floor((x / tw) * wordmark.width);
      const sy = Math.floor((y / th) * wordmark.height);
      const si = (sy * wordmark.width + sx) << 2;
      const sa = (wordmark.data[si + 3] / 255) * a;
      if (sa < 0.05) continue;
      const di = ((dy + y) * OUT_W + (dx + x)) << 2;
      buf[di] = Math.round(buf[di] * (1 - sa) + wordmark.data[si] * sa);
      buf[di + 1] = Math.round(buf[di + 1] * (1 - sa) + wordmark.data[si + 1] * sa);
      buf[di + 2] = Math.round(buf[di + 2] * (1 - sa) + wordmark.data[si + 2] * sa);
    }
  }
}

function crtWipe(buf, progress, rgb = C.phosphor) {
  // horizontal CRT wipe from top
  const band = Math.floor(OUT_H * clamp(progress, 0, 1));
  fillRect(buf, 0, 0, OUT_W, band, rgb, 40);
  if (band > 0 && band < OUT_H) {
    fillRect(buf, 0, band - 4, OUT_W, 8, rgb, 180);
  }
}

/**
 * Scene timing (seconds):
 *  0.0–3.5  Play button (zoom + tap)
 *  3.5–6.5  Booting
 *  6.5–11.0 Gauntlet → Fight CTA
 * 11.0–15.0 Battle + end sting
 */
function renderFrame(t, stills, wordmark) {
  let buf;
  let flash = 0;
  let flashColor = C.phosphor;

  if (t < 3.5) {
    const u = t / 3.5;
    // First still is landscape desktop TG — bias hard to the bottom Play bar.
    const zoom = lerp(1.02, 1.18, easeOutCubic(u));
    const panX = lerp(0.08, 0.0, u);
    const panY = lerp(0.7, 0.98, easeInOut(u));
    buf = sampleCover(stills.play, panX, panY, zoom);

    // Finger approaches and taps ~2.4–2.9s
    if (t > 1.4 && t < 3.2) {
      const tapT = (t - 1.4) / 1.8;
      const pressed = t > 2.35 && t < 2.7;
      const cx = Math.floor(OUT_W * lerp(0.55, 0.22, easeOutCubic(tapT)));
      const cy = Math.floor(OUT_H * lerp(0.62, 0.86, easeOutCubic(tapT)));
      drawCursor(buf, cx, cy, pressed);
      if (pressed) {
        flash = 0.35;
        flashColor = C.cyan;
      }
    }
    if (t > 3.15) crtWipe(buf, (t - 3.15) / 0.35, C.black);
  } else if (t < 6.5) {
    const u = (t - 3.5) / 3.0;
    const zoom = lerp(1.05, 1.2, u);
    buf = sampleCover(stills.boot, 0.5, 0.45, zoom);
    // Boot pulse — phosphor blink
    if (Math.floor(t * 6) % 2 === 0) flashOverlay(buf, C.phosphor, 0.08);
    if (u < 0.15) crtWipe(buf, 1 - u / 0.15, C.black);
    if (u > 0.85) crtWipe(buf, (u - 0.85) / 0.15, C.black);
  } else if (t < 11.0) {
    const u = (t - 6.5) / 4.5;
    // Start mid list, push down toward Fight CTA
    const zoom = lerp(1.08, 1.45, easeOutCubic(u));
    const panY = lerp(0.25, 0.78, easeInOut(u));
    buf = sampleCover(stills.gauntlet, 0.5, panY, zoom);
    if (u < 0.12) crtWipe(buf, 1 - u / 0.12, C.black);

    // Tap Fight near end of scene
    if (t > 9.4 && t < 10.7) {
      const tapT = (t - 9.4) / 1.3;
      const pressed = t > 10.0 && t < 10.35;
      const cx = Math.floor(OUT_W * lerp(0.6, 0.42, tapT));
      const cy = Math.floor(OUT_H * lerp(0.7, 0.86, tapT));
      drawCursor(buf, cx, cy, pressed);
      if (pressed) {
        flash = 0.45;
        flashColor = C.phosphor;
      }
    }
    if (u > 0.9) crtWipe(buf, (u - 0.9) / 0.1, C.magenta);
  } else {
    const u = (t - 11.0) / 4.0;
    const zoom = lerp(1.1, 1.28, easeOutCubic(Math.min(1, u * 1.2)));
    buf = sampleCover(stills.battle, 0.5, 0.42, zoom);
    if (u < 0.12) {
      flash = 0.5 * (1 - u / 0.12);
      flashColor = C.magenta;
    }
    // End card brand overlay
    if (u > 0.55) {
      const a = easeOutCubic(clamp((u - 0.55) / 0.25, 0, 1));
      fillRect(buf, 0, 0, OUT_W, OUT_H, C.black, Math.floor(a * 160));
      blitWordmark(buf, wordmark, a);
    }
    if (u > 0.85 && Math.floor(t * 8) % 2 === 0) {
      flashOverlay(buf, C.magenta, 0.12);
    }
  }

  applyScanlines(buf, 0.12);
  applyVignette(buf, 0.28);
  if (flash > 0) flashOverlay(buf, flashColor, flash);
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

  const whoosh = await loadWav('whoosh.wav');
  const scan = await loadWav('scan-beep.wav');
  const coin = await loadWav('coin.wav');
  const critical = await loadWav('critical.wav');
  const fanfare = await loadWav('fanfare.wav');
  const boom = await loadWav('boom.wav');
  const flip = await loadWav('flip.wav');
  const thud = await loadWav('thud.wav');
  const win = await loadWav('stat-win.wav');

  // Enter Telegram / approach Play
  place(whoosh, 0.3, 0.65);
  place(flip, 1.2, 0.45);
  place(thud, 2.45, 0.7); // tap Play
  place(critical, 2.55, 0.85);
  place(coin, 2.7, 0.75);

  // Booting
  place(scan, 3.6, 0.9);
  place(scan, 4.2, 0.7);
  place(scan, 4.8, 0.7);
  place(scan, 5.4, 0.55);
  place(fanfare, 5.8, 0.55);

  // Gauntlet
  place(whoosh, 6.6, 0.55);
  place(flip, 7.5, 0.4);
  place(scan, 8.4, 0.45);
  place(thud, 10.1, 0.75); // tap Fight
  place(critical, 10.2, 0.9);
  place(coin, 10.35, 0.7);

  // Battle + end
  place(boom, 11.05, 0.95);
  place(fanfare, 11.25, 0.8);
  place(win, 12.4, 0.55);
  place(critical, 13.6, 0.45);
  place(boom, 14.2, 0.5);

  for (let i = 0; i < total; i++) {
    const sec = i / sampleRate;
    const hum =
      Math.sin(2 * Math.PI * 55 * sec) * 0.028 +
      Math.sin(2 * Math.PI * 110 * sec) * 0.012;
    const gate = sec >= 3.5 && sec < 11 ? 1 : 0.4;
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
  console.log('Generating GleanAI teaser from real stills…');
  await mkdir(OUT_DIR, { recursive: true });
  await rm(TMP_DIR, { recursive: true, force: true });
  await mkdir(TMP_DIR, { recursive: true });

  const stills = {
    play: await loadPng(path.join(STILL_DIR, '01-play.png')),
    boot: await loadPng(path.join(STILL_DIR, '02-booting.png')),
    gauntlet: await loadPng(path.join(STILL_DIR, '03-gauntlet.png')),
    battle: await loadPng(path.join(STILL_DIR, '04-battle.png')),
  };
  let wordmark = null;
  try {
    wordmark = await loadPng(WORDMARK_PATH);
  } catch {
    console.warn('⚠ wordmark missing — end card without brand overlay');
  }

  for (let f = 0; f < FRAME_COUNT; f++) {
    const t = f / FPS;
    const rgba = renderFrame(t, stills, wordmark);
    const name = `frame_${String(f).padStart(4, '0')}.png`;
    await writeFile(path.join(TMP_DIR, name), rgbaToPng(rgba));
    if (f % 24 === 0) console.log(`  frames ${f}/${FRAME_COUNT}`);
  }
  console.log(`✓ ${FRAME_COUNT} frames @ ${OUT_W}×${OUT_H}`);

  const audioPath = path.join(TMP_DIR, 'teaser-audio.wav');
  await buildSoundtrack(audioPath);
  console.log('✓ soundtrack mixed');

  const outMp4 = path.join(OUT_DIR, 'gleanai-teaser.mp4');
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
