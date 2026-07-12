export function buildInviteLink(botUsername: string, referralCode: string): string {
  const user = botUsername.replace(/^@/, '');
  return `https://t.me/${user}?start=${encodeURIComponent(referralCode)}`;
}

export function buildTelegramShareLink(inviteLink: string, text: string): string {
  const qs = new URLSearchParams({
    url: inviteLink,
    text,
  });
  return `https://t.me/share/url?${qs.toString()}`;
}
