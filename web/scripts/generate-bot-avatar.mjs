/**
 * Renders animated Coin Slot (#1) frames and exports:
 *   - gleanai-avatar.gif  (share / preview)
 *   - gleanai-avatar.mp4    (Telegram animated profile pic — requires ffmpeg)
 *
 * Telegram does NOT animate GIF profile pics; upload the MP4 via BotFather.
 * Spec: 800×800, H.264, yuv420p, no audio, ≤10s, ≤2MB, faststart.
 */

import { mkdir, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import gifenc from 'gifenc';
import { PNG } from 'pngjs';

const require = createRequire(import.meta.url);
const { GIFEncoder, quantize, applyPalette } = gifenc;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/brand');
const TMP_DIR = path.resolve(__dirname, '../.tmp/avatar-frames');

const GRID = 32;
const SIZE = 800;
const SCALE = SIZE / GRID;
const FPS = 10;
const FRAME_COUNT = 20;

const C = {
  void: '#06080d',
  screen: '#0a0e15',
  grid: '#1b2130',
  phosphor: '#27ff7d',
  cyan: '#2bd9ff',
  amber: '#ffb437',
  magenta: '#ff3da6',
  bone: '#e7ece5',
};

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

const PALETTE = Object.fromEntries(
  Object.entries(C).map(([k, v]) => [k, hexToRgb(v)]),
);

function fillRect(x, y, w, h) {
  const cells = [];
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      cells.push([x + col, y + row]);
    }
  }
  return cells;
}

function outlineRect(x0, y0, x1, y1) {
  const cells = [];
  for (let x = x0; x <= x1; x++) cells.push([x, y0], [x, y1]);
  for (let y = y0 + 1; y < y1; y++) cells.push([x0, y], [x1, y]);
  return cells;
}

/** Coin body anchored so `top` is the coin's top row (default rest: 5). */
function coinCells(top) {
  return [
    [13, top], [14, top], [15, top], [16, top], [17, top], [18, top],
    [12, top + 1], [19, top + 1],
    [12, top + 2], [19, top + 2],
    [13, top + 3], [14, top + 3], [15, top + 3], [16, top + 3], [17, top + 3], [18, top + 3],
  ];
}

function coinHighlight(top) {
  return [[14, top + 1], [15, top + 1]];
}

/** Eased coin drop: floats above slot, drops in, brief hold, loops. */
function coinTopForFrame(frame) {
  const t = frame / FRAME_COUNT;
  if (t < 0.15) return 3;
  if (t < 0.45) {
    const p = (t - 0.15) / 0.3;
    return Math.round(3 + p * 2); // 3 → 5
  }
  if (t < 0.7) return 5;
  if (t < 0.85) return 5;
  return 4 + Math.round(Math.sin((t - 0.85) * Math.PI * 4) * 0.5);
}

function labelLit(frame) {
  const t = frame / FRAME_COUNT;
  return t > 0.5 && Math.floor(frame / 2) % 2 === 0;
}

function ledLit(frame) {
  return Math.floor(frame / 3) % 2 === 0;
}

function buildLayers(frame) {
  const coinTop = coinTopForFrame(frame);
  const layers = [];

  layers.push({ cells: outlineRect(5, 3, 26, 23), color: 'grid' });
  layers.push({ cells: fillRect(7, 5, 18, 16), color: 'screen' });
  layers.push({
    cells: [
      ...fillRect(11, 8, 10, 1),
      [11, 9], [20, 9],
      [11, 10], [20, 10],
      [11, 11], [20, 11],
      [11, 12], [20, 12],
      [11, 13], [20, 13],
    ],
    color: 'void',
  });
  layers.push({ cells: coinCells(coinTop), color: 'phosphor' });
  layers.push({ cells: coinHighlight(coinTop), color: 'bone' });
  if (labelLit(frame)) {
    layers.push({ cells: fillRect(12, 15, 8, 1), color: 'cyan' });
  }
  layers.push({
    cells: [
      [13, 17], [14, 17], [15, 17], [16, 17], [17, 17], [18, 17],
      [12, 18], [19, 18],
      [12, 19], [19, 19],
      [13, 20], [14, 20], [15, 20], [16, 20], [17, 20], [18, 20],
    ],
    color: 'amber',
  });
  if (ledLit(frame)) {
    layers.push({ cells: [[23, 6]], color: 'magenta' });
  }
  layers.push({
    cells: [
      [8, 24], [9, 24], [10, 24],
      [21, 24], [22, 24], [23, 24],
    ],
    color: 'grid',
  });
  layers.push({ cells: fillRect(6, 26, 20, 1), color: 'grid' });

  return layers;
}

function renderFrame(frame) {
  const rgba = new Uint8Array(SIZE * SIZE * 4);
  const bg = PALETTE.void;
  for (let i = 0; i < SIZE * SIZE; i++) {
    rgba[i * 4] = bg[0];
    rgba[i * 4 + 1] = bg[1];
    rgba[i * 4 + 2] = bg[2];
    rgba[i * 4 + 3] = 255;
  }

  for (const { cells, color } of buildLayers(frame)) {
    const rgb = PALETTE[color];
    for (const [gx, gy] of cells) {
      for (let dy = 0; dy < SCALE; dy++) {
        for (let dx = 0; dx < SCALE; dx++) {
          const px = (gy * SCALE + dy) * SIZE + (gx * SCALE + dx);
          rgba[px * 4] = rgb[0];
          rgba[px * 4 + 1] = rgb[1];
          rgba[px * 4 + 2] = rgb[2];
          rgba[px * 4 + 3] = 255;
        }
      }
    }
  }

  return rgba;
}

function rgbaToPng(rgba) {
  const png = new PNG({ width: SIZE, height: SIZE });
  png.data = Buffer.from(rgba);
  return PNG.sync.write(png);
}

async function writeGif(frames) {
  const gif = GIFEncoder();
  const delay = Math.round(1000 / FPS);

  for (const rgba of frames) {
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, SIZE, SIZE, {
      palette,
      delay,
      dispose: 2,
    });
  }

  gif.finish();
  await writeFile(path.join(OUT_DIR, 'gleanai-avatar.gif'), Buffer.from(gif.bytes()));
}

function findFfmpeg() {
  try {
    return require('@ffmpeg-installer/ffmpeg').path;
  } catch {
    // fall through
  }

  const candidates = [
    process.env.FFMPEG_PATH,
    'ffmpeg',
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    path.join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
  ].filter(Boolean);

  return candidates[0] ?? 'ffmpeg';
}

async function writeMp4(pngBuffers) {
  await rm(TMP_DIR, { recursive: true, force: true });
  await mkdir(TMP_DIR, { recursive: true });

  let i = 0;
  for (const buf of pngBuffers) {
    const name = `frame_${String(i).padStart(3, '0')}.png`;
    await writeFile(path.join(TMP_DIR, name), buf);
    i++;
  }

  const ffmpeg = findFfmpeg();
  const mp4Path = path.join(OUT_DIR, 'gleanai-avatar.mp4');
  const pattern = path.join(TMP_DIR, 'frame_%03d.png').replace(/\\/g, '/');

  await new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-framerate', String(FPS),
      '-i', pattern,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-movflags', '+faststart',
      '-vf', 'scale=800:800:flags=neighbor',
      mp4Path,
    ];

    const proc = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('error', (e) => reject(e));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${err}`));
    });
  });

  await rm(TMP_DIR, { recursive: true, force: true });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const frames = [];
  const pngBuffers = [];
  for (let f = 0; f < FRAME_COUNT; f++) {
    const rgba = renderFrame(f);
    frames.push(rgba);
    pngBuffers.push(rgbaToPng(rgba));
  }

  await writeGif(frames);
  console.log(`✓ GIF  → ${path.join(OUT_DIR, 'gleanai-avatar.gif')}`);

  try {
    await writeMp4(pngBuffers);
    console.log(`✓ MP4  → ${path.join(OUT_DIR, 'gleanai-avatar.mp4')} (use this for Telegram)`);
  } catch (err) {
    console.warn('⚠ MP4 skipped — ffmpeg not found.');
    console.warn('  Install: winget install Gyan.FFmpeg');
    console.warn('  Then re-run: npm run generate:avatar --workspace web');
    console.warn(`  (${err instanceof Error ? err.message : err})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
