/**
 * GleanAI color palette — single source of truth.
 *
 * Role map (use these jobs, not random accents):
 *   void/screen/slate/grid → surfaces & chrome
 *   bone                   → primary body text
 *   ash                    → secondary / muted chrome text
 *   mute                   → meta labels, status-bar copy
 *   dim                    → deep mute (scroll cues, idle hints)
 *   phosphor               → primary signal (CTAs, live stats, Wallet Wars, Sprint)
 *   cyan                   → secondary signal (tags, quest/info)
 *   amber                  → game accent (Receipt, coin prompts, warnings)
 *   magenta                → danger + brand "AI" moment only
 */
export const palette = {
  void: '#06080d',
  screen: '#0a0e15',
  slate: '#11151f',
  grid: '#1b2130',
  bone: '#e7ece5',
  ash: '#7d8694',
  mute: '#666666',
  dim: '#444444',
  phosphor: '#27ff7d',
  cyan: '#2bd9ff',
  amber: '#ffb437',
  magenta: '#ff3da6',
} as const;

export type PaletteColor = keyof typeof palette;

/** Accent tones used by CRT panels / game cards. */
export const accents = {
  phosphor: palette.phosphor,
  cyan: palette.cyan,
  amber: palette.amber,
  magenta: palette.magenta,
} as const;

export type AccentTone = keyof typeof accents;
