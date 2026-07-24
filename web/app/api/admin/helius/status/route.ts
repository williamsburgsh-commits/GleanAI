import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { getClaimAuthorityPubkey } from '@/lib/claims/claimAuthority';

export const runtime = 'nodejs';

// GET /api/admin/helius/status — config booleans only (no secrets)
export async function GET() {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return NextResponse.json({
    helius: {
      apiKey: Boolean(process.env.HELIUS_API_KEY?.trim()),
      webhookId: Boolean(process.env.HELIUS_WEBHOOK_ID?.trim()),
      webhookSecret: Boolean(process.env.HELIUS_WEBHOOK_SECRET?.trim()),
    },
    claims: {
      mint: Boolean(
        process.env.CLAIM_MINT?.trim() || process.env.NEXT_PUBLIC_CLAIM_MINT?.trim()
      ),
      programId: Boolean(
        process.env.CLAIM_PROGRAM_ID?.trim() ||
          process.env.NEXT_PUBLIC_CLAIM_PROGRAM_ID?.trim()
      ),
      authorityPubkey: Boolean(getClaimAuthorityPubkey()),
      authoritySecret: Boolean(process.env.CLAIM_AUTHORITY_SECRET?.trim()),
    },
    supabase: {
      url: Boolean(process.env.SUPABASE_URL?.trim()),
      serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    },
    telegram: {
      botToken: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
    },
  });
}
