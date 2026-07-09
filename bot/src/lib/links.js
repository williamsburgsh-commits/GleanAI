import { config } from '../config.js';

// Builds a link into the web app carrying the Telegram id so the web app can
// tie a connected wallet (and later quest actions) back to this user.
export function buildWebLink(telegramId, path = '') {
  const base = config.webAppUrl.replace(/\/$/, '');
  const suffix = path ? `/${path.replace(/^\//, '')}` : '';
  return `${base}${suffix}?tg=${telegramId}`;
}

// The Telegram Mini App entry (the visual in-app experience). Identity comes
// from Telegram initData, so no ?tg= is needed here.
export function buildMiniAppUrl() {
  const base = config.webAppUrl.replace(/\/$/, '');
  return `${base}/app`;
}

export function buildMiniAppPath(path = 'app') {
  const base = config.webAppUrl.replace(/\/$/, '');
  const suffix = path.replace(/^\//, '');
  return suffix ? `${base}/${suffix}` : `${base}/app`;
}

// Telegram only allows web_app buttons / menu buttons over HTTPS.
export function isWebAppCapable() {
  return config.webAppUrl.trim().toLowerCase().startsWith('https://');
}
