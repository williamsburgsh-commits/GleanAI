export interface QuestBonus {
  shield: number;
  power: number;
  strike: number;
  armor: number;
  agility: number;
}

export const QUEST_BOOST_MAP: Record<string, Partial<QuestBonus>> = {
  'connect-wallet': { agility: 15 },
  'fund-wallet': { shield: 20 },
  'first-swap': { strike: 25 },
  'swap-again': { strike: 15 },
  'stake-sol': { armor: 25 },
  'stake-more': { armor: 15 },
  'mint-nft': { power: 30 },
  'mint-fighter-badge': { power: 40 },
  'stake-fighter-badge': { power: 35, armor: 10 },
};

export const QUEST_BOOST_HINTS: { slug: string; label: string; boost: Partial<QuestBonus> }[] = [
  { slug: 'connect-wallet', label: 'Connect Wallet', boost: { agility: 15 } },
  { slug: 'fund-wallet', label: 'Fund Wallet', boost: { shield: 20 } },
  { slug: 'first-swap', label: 'First Swap', boost: { strike: 25 } },
  { slug: 'swap-again', label: 'Swap Pro', boost: { strike: 15 } },
  { slug: 'stake-sol', label: 'Stake SOL', boost: { armor: 25 } },
  { slug: 'stake-more', label: 'Stake More', boost: { armor: 15 } },
  { slug: 'mint-nft', label: 'Mint NFT', boost: { power: 30 } },
  { slug: 'mint-fighter-badge', label: 'Fighter Badge', boost: { power: 40 } },
  { slug: 'stake-fighter-badge', label: 'Train Badge', boost: { power: 35, armor: 10 } },
];

export function computeQuestBonus(completedSlugs: Set<string>): QuestBonus {
  const bonus: QuestBonus = { shield: 0, power: 0, strike: 0, armor: 0, agility: 0 };
  for (const slug of completedSlugs) {
    const b = QUEST_BOOST_MAP[slug];
    if (!b) continue;
    bonus.shield += b.shield ?? 0;
    bonus.power += b.power ?? 0;
    bonus.strike += b.strike ?? 0;
    bonus.armor += b.armor ?? 0;
    bonus.agility += b.agility ?? 0;
  }
  return bonus;
}

export function hasRarityBumpQuest(completedSlugs: Set<string>): boolean {
  return completedSlugs.has('mint-nft') || completedSlugs.has('mint-fighter-badge');
}
