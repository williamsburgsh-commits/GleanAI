// The five onboarding actions the Sprint mirrors. Shared by the game UI and
// (optionally) educational copy. Order is the canonical onboarding order.
export interface SprintAction {
  key: string;
  label: string;
  hint: string;
}

export const SPRINT_ACTIONS: SprintAction[] = [
  { key: 'wallet', label: 'Create Wallet', hint: 'Your Solana identity.' },
  { key: 'sol', label: 'Get SOL', hint: 'Fuel for transactions.' },
  { key: 'swap', label: 'Swap', hint: 'Trade one token for another.' },
  { key: 'stake', label: 'Stake', hint: 'Earn by securing the network.' },
  { key: 'nft', label: 'Mint NFT', hint: 'Your first collectible.' },
];

export const TOTAL_ACTIONS = SPRINT_ACTIONS.length;
