/** Short branded X caption — OG image card carries the round detail. */
export function buildRecapShareText(opts: {
  mode: 'boss' | 'pvp';
  bossName?: string | null;
  opponentName?: string | null;
  challengerWon: boolean;
  isTie: boolean;
  challengerWins: number;
  opponentWins: number;
  resultUrl: string;
  /** dial.to Boss Challenge Blink */
  blinkUrl?: string;
}): string {
  const score = `${opts.challengerWins}–${opts.opponentWins}`;
  const outcome = opts.isTie ? 'Drew' : opts.challengerWon ? 'Won' : 'Lost';
  const cta = 'Think you can clear the ladder?';

  if (opts.mode === 'boss') {
    const name = opts.bossName?.trim() || 'a boss';
    const lines = [
      `I just fought ${name} in Boss Gauntlet on GleanAI.`,
      `${outcome} ${score}. ${cta}`,
      opts.resultUrl,
    ];
    if (opts.blinkUrl) {
      lines.push(`Challenge a boss: ${opts.blinkUrl}`);
    }
    return lines.join('\n');
  }

  const foe = opts.opponentName?.trim() || 'a rival';
  return [
    `I just fought ${foe} in Wallet Wars on GleanAI.`,
    `${outcome} ${score}. Think you can take the arena?`,
    opts.resultUrl,
  ].join('\n');
}
