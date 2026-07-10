/** Canonical public origin for share links / OG previews (never localhost). */
export const DEFAULT_WEB_APP_URL = 'https://glean-ai-web.vercel.app';

export function getPublicWebAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WEB_APP_URL?.replace(/\/$/, '') ||
    process.env.WEB_APP_URL?.replace(/\/$/, '') ||
    DEFAULT_WEB_APP_URL
  );
}
