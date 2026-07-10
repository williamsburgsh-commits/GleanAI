/**
 * Renders the GLEANAI wordmark (site hero style) to a square PNG for X / Telegram pfp.
 * Output: public/brand/gleanai-wordmark-pfp.png (800×800)
 */

import React from 'react';
import opentype from '@shuding/opentype.js';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/brand');
const OUT_PATH = path.join(OUT_DIR, 'gleanai-wordmark-pfp.png');

const FONT_URL =
  'https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf';

const SIZE = 800;
const TARGET_WIDTH_RATIO = 0.65;
const SCANLINE = '#0d1219';
const WORDMARK = 'GLEANAI';

function pathBBox(path) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const command of path.commands) {
    for (const key of ['x', 'y', 'x1', 'y1', 'x2', 'y2']) {
      const value = command[key];
      if (value === undefined) continue;
      if (key === 'x' || key === 'x1' || key === 'x2') {
        minX = Math.min(minX, value);
        maxX = Math.max(maxX, value);
      } else {
        minY = Math.min(minY, value);
        maxY = Math.max(maxY, value);
      }
    }
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function wordmarkMetrics(font, fontSize) {
  const ink = pathBBox(font.getPath(WORDMARK, 0, 0, fontSize));
  const advance = font.getAdvanceWidth(WORDMARK, fontSize);
  return { ink, advance };
}

function wordmarkFontSize(font, canvasSize) {
  const targetWidth = canvasSize * TARGET_WIDTH_RATIO;
  const probe = 100;
  const { width: widthAtProbe } = pathBBox(font.getPath(WORDMARK, 0, 0, probe));
  return Math.round((targetWidth / widthAtProbe) * probe);
}

function Wordmark({ fontSize }) {
  return React.createElement(
    'div',
    {
      style: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontFamily: 'Press Start 2P',
        lineHeight: 1,
        letterSpacing: 0,
      },
    },
    React.createElement(
      'span',
      {
        style: {
          color: '#27ff7d',
          textShadow: '0 0 8px rgba(39, 255, 125, 0.45)',
        },
      },
      'GLEAN',
    ),
    React.createElement('span', { style: { color: '#ff3da6' } }, 'AI'),
    React.createElement('div', {
      style: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: 1,
        marginTop: -0.5,
        backgroundColor: SCANLINE,
      },
    }),
  );
}

async function main() {
  const fontRes = await fetch(FONT_URL);
  if (!fontRes.ok) {
    throw new Error(`Failed to fetch Press Start 2P font (${fontRes.status})`);
  }
  const fontData = await fontRes.arrayBuffer();
  const font = opentype.parse(fontData);
  const fontSize = wordmarkFontSize(font, SIZE);
  const { ink, advance } = wordmarkMetrics(font, fontSize);
  const centerNudgeX = (advance - ink.width) / 2;
  const centerNudgeY = (fontSize - ink.height) / 2;

  const svg = await satori(
    React.createElement(
      'div',
      {
        style: {
          width: SIZE,
          height: SIZE,
          backgroundColor: '#06080d',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            transform: `translate(${centerNudgeX}px, ${centerNudgeY}px)`,
          },
        },
        React.createElement(Wordmark, { fontSize }),
      ),
    ),
    {
      width: SIZE,
      height: SIZE,
      fonts: [
        {
          name: 'Press Start 2P',
          data: fontData,
          weight: 400,
          style: 'normal',
        },
      ],
    },
  );

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: SIZE },
  })
    .render()
    .asPng();

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_PATH, png);
  console.log(
    `✓ PNG  → ${OUT_PATH} (${SIZE}×${SIZE}, font ${fontSize}px, glyphs ~${ink.width.toFixed(1)}px wide)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
