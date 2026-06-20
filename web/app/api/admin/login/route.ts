import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  checkPassword,
  getAdminPassword,
} from '@/lib/adminAuth';

export const runtime = 'nodejs';

// POST /api/admin/login { password }
export async function POST(request: Request) {
  if (!getAdminPassword()) {
    return NextResponse.json(
      { error: 'Admin dashboard is not configured (set ADMIN_DASHBOARD_PASSWORD).' },
      { status: 503 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const password = (body.password || '').toString();
  if (!checkPassword(password)) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, password, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
