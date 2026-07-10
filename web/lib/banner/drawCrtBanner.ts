export const BANNER_WIDTH = 1500;
export const BANNER_HEIGHT = 500;

const BG = '#0a0a0a';
const GREEN = '#00ff88';
const PINK = '#ff2d78';
const GRAY = '#444444';
const FOOTER_GRAY = '#3a3a3a';

const FONT = '"Press Start 2P", monospace';

export type CrtBannerFrame = {
  /** When false, the insert-coin underscore is omitted (static export). */
  showCursor: boolean;
  /** Drifting CRT highlight line; omit for static export. */
  highlightY: number | null;
};

export async function ensureBannerFonts(): Promise<void> {
  const sizes = [10, 11, 14, 22, 9];
  await Promise.all(sizes.map((size) => document.fonts.load(`${size}px ${FONT}`)));
  await document.fonts.ready;
}

function drawScreenBase(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
}

/** Darken-only CRT curvature + vignette — center stays base black, edges/corners get darker. */
function drawCurvatureAndVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.translate(cx, cy);
  // Elliptical falloff so a wide banner darkens evenly at all four edges.
  ctx.scale(1, h / w);

  const radius = w / 2;
  const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.62, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.88, 'rgba(0, 0, 0, 0.28)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.58)');

  ctx.fillStyle = shade;
  ctx.fillRect(-cx, -cy, w, h);
  ctx.restore();
}

function drawWordmark(ctx: CanvasRenderingContext2D) {
  const x = 48;
  const y = 54;
  const wordmarkSize = 14;
  const taglineSize = 10;

  ctx.font = `${wordmarkSize}px ${FONT}`;
  ctx.textBaseline = 'top';

  const gleanW = ctx.measureText('GLEAN').width;
  ctx.fillStyle = GREEN;
  ctx.fillText('GLEAN', x, y);

  ctx.fillStyle = PINK;
  ctx.fillText('AI', x + gleanW, y);

  const wordmarkW = ctx.measureText('GLEANAI').width;
  const taglineX = x + wordmarkW + 28;
  const taglineY = y + 3;

  ctx.font = `${taglineSize}px ${FONT}`;
  ctx.fillStyle = GRAY;
  ctx.fillText('// ONBOARDING ARCADE', taglineX, taglineY);
}

function drawCenterPrompt(ctx: CanvasRenderingContext2D, showCursor: boolean) {
  const w = BANNER_WIDTH;
  const h = BANNER_HEIGHT;
  const size = 22;

  ctx.font = `${size}px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = GREEN;

  const base = 'INSERT WALLET TO PLAY';
  const suffix = showCursor ? '_' : '';
  const text = `${base}${suffix}`;
  const textW = ctx.measureText(text).width;

  ctx.fillText(text, (w - textW) / 2, h / 2);
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  const w = BANNER_WIDTH;
  const h = BANNER_HEIGHT;
  const size = 9;
  const text = 'POWERED BY SOLANA · OPEN SOURCE';

  ctx.font = `${size}px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = FOOTER_GRAY;

  const textW = ctx.measureText(text).width;
  ctx.fillText(text, (w - textW) / 2, h - 36);
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  for (let y = 0; y < h; y += 2) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, y, w, 1);
  }
}

function drawHighlightLine(ctx: CanvasRenderingContext2D, y: number, w: number) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(0, Math.round(y), w, 1);
}

/** Draw one banner frame onto a 1500×500 canvas context. */
export function drawCrtBanner(ctx: CanvasRenderingContext2D, frame: CrtBannerFrame) {
  const w = BANNER_WIDTH;
  const h = BANNER_HEIGHT;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;

  drawScreenBase(ctx, w, h);
  drawWordmark(ctx);
  drawCenterPrompt(ctx, frame.showCursor);
  drawFooter(ctx);
  drawScanlines(ctx, w, h);
  drawCurvatureAndVignette(ctx, w, h);

  if (frame.highlightY !== null) {
    drawHighlightLine(ctx, frame.highlightY, w);
  }
}

export function staticBannerFrame(): CrtBannerFrame {
  return { showCursor: true, highlightY: null };
}

export function animatedBannerFrame(now: number): CrtBannerFrame {
  const blinkOn = Math.floor(now / 1000) % 2 === 0;
  const highlightY = ((now % 4000) / 4000) * BANNER_HEIGHT;
  return { showCursor: blinkOn, highlightY };
}
