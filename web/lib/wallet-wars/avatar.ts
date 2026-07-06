export function fighterAvatarUrl(walletAddress: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(walletAddress)}`;
}

export function botAvatarUrl(botSeed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(`bot-${botSeed}`)}`;
}
