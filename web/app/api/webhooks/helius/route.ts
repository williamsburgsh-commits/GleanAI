import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { processHeliusWebhookBody } from '@/lib/helius/autoComplete.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function extractSecret(request: Request): string {
  const auth = request.headers.get('authorization')?.trim() ?? '';
  if (auth) {
    // Helius may send the raw secret or "Bearer <secret>"
    if (auth.toLowerCase().startsWith('bearer ')) {
      return auth.slice(7).trim();
    }
    return auth;
  }
  const header = request.headers.get('x-helius-secret')?.trim() ?? '';
  if (header) return header;
  return new URL(request.url).searchParams.get('secret')?.trim() ?? '';
}

function authorize(request: Request): boolean {
  const expected = process.env.HELIUS_WEBHOOK_SECRET?.trim() ?? '';
  if (!expected) {
    console.error('[api/webhooks/helius] HELIUS_WEBHOOK_SECRET unset');
    return false;
  }
  const got = extractSecret(request);
  if (!got) return false;
  return safeEqual(got, expected);
}

// POST /api/webhooks/helius — Helius enhanced transaction deliveries
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Acknowledge bad JSON so Helius does not retry forever.
    return NextResponse.json({ ok: true, processed: 0, awarded: 0 });
  }

  try {
    const { processed, awarded } = await processHeliusWebhookBody(body);
    return NextResponse.json({
      ok: true,
      processed,
      awarded: awarded.length,
      quests: awarded.map((a) => a.quest.slug),
    });
  } catch (err) {
    console.error('[api/webhooks/helius]', err);
    // Still 200 so transient DB blips do not disable the webhook after retries.
    return NextResponse.json({ ok: true, processed: 0, awarded: 0, soft: true });
  }
}
