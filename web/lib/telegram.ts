import { createHmac } from 'node:crypto';

// ---------------------------------------------------------------------------
// Telegram Mini App initData verification (server-side).
// Docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
//
//   1. parse initData (a query string) into key/value pairs
//   2. pull out `hash`, build the data-check-string from the rest (sorted, \n)
//   3. secret = HMAC_SHA256(key="WebAppData", message=bot_token)
//   4. expected = HMAC_SHA256(key=secret, message=data_check_string) as hex
//   5. constant-time compare expected === hash
// ---------------------------------------------------------------------------

export interface TelegramInitUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface VerifiedInitData {
  user: TelegramInitUser;
  authDate: number;
  startParam?: string;
}

// How old initData may be before we reject it (replay protection).
const MAX_AUTH_AGE_SECONDS = 60 * 60 * 24; // 24h

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function verifyInitData(
  initData: string,
  botToken: string,
  opts: { maxAgeSeconds?: number } = {}
): VerifiedInitData | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (!timingSafeEqualHex(expected, hash)) return null;

  const authDate = Number(params.get('auth_date') || 0);
  const maxAge = opts.maxAgeSeconds ?? MAX_AUTH_AGE_SECONDS;
  if (!authDate || Date.now() / 1000 - authDate > maxAge) return null;

  const userRaw = params.get('user');
  if (!userRaw) return null;
  let user: TelegramInitUser;
  try {
    user = JSON.parse(userRaw) as TelegramInitUser;
  } catch {
    return null;
  }
  if (!user?.id) return null;

  return {
    user,
    authDate,
    startParam: params.get('start_param') || undefined,
  };
}
