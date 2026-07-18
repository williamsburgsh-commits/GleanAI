export function fighterAvatarUrl(walletAddress: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(walletAddress)}`;
}

/** PNG variant for Metaplex / wallet NFT galleries (SVG often unsupported). */
export function fighterAvatarPngUrl(walletAddress: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(walletAddress)}`;
}

export function botAvatarUrl(botSeed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(`bot-${botSeed}`)}`;
}
