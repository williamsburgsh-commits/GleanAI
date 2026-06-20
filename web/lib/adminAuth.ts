import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'glean_admin';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours

export function getAdminPassword(): string {
  return process.env.ADMIN_DASHBOARD_PASSWORD?.trim() || '';
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function checkPassword(candidate: string): boolean {
  const pw = getAdminPassword();
  if (!pw) return false;
  return safeEqual(candidate, pw);
}

// True if the current request carries a valid admin cookie.
export function isAuthed(): boolean {
  const pw = getAdminPassword();
  if (!pw) return false;
  const cookie = cookies().get(ADMIN_COOKIE)?.value;
  if (!cookie) return false;
  return safeEqual(cookie, pw);
}
