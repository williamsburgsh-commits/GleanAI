// Formats a millisecond duration as seconds with two decimals, e.g. "11.42s".
export function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

// A short human phrase for the result card, e.g. "Onboarded in 11.42 seconds".
export function onboardedPhrase(ms: number): string {
  return `Onboarded in ${(ms / 1000).toFixed(2)} seconds`;
}
