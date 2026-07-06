export const TAUNT_PRESETS = [
  'Your wallet is newer than my shoes 👟',
  'Hope you staked enough for this 💀',
  'On-chain history never lies 📊',
  'GG before it begins 🎮',
  'My SOL is older than your strategy ⏳',
];

export function randomBotTaunt(): string {
  return TAUNT_PRESETS[Math.floor(Math.random() * TAUNT_PRESETS.length)] ?? TAUNT_PRESETS[0];
}
