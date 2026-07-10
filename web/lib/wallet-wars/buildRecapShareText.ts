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
}): string {
  const score = `${opts.challengerWins}–${opts.opponentWins}`;
  const outcome = opts.isTie ? 'Drew' : opts.challengerWon ? 'Won' : 'Lost';
  const cta = 'Think you can clear the ladder?';

  if (opts.mode === 'boss') {
    const name = opts.bossName?.trim() || 'a boss';
    return [
      `I just fought ${name} in Boss Gauntlet on GleanAI.`,
      `${outcome} ${score}. ${cta}`,
      opts.resultUrl,
    ].join('\n');
  }

  const foe = opts.opponentName?.trim() || 'a rival';
  return [
    `I just fought ${foe} in Wallet Wars on GleanAI.`,
    `${outcome} ${score}. Think you can take the arena?`,
    opts.resultUrl,
  ].join('\n');
}
