import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { getClaimConfig, listClaimEpochs } from '@/lib/claims/publish.server';

export const runtime = 'nodejs';

// GET /api/admin/claims
export async function GET() {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();
    const epochs = await listClaimEpochs(supabase);
    const config = getClaimConfig();
    return NextResponse.json({
      epochs,
      config: {
        mint: config.mint || null,
        programId: config.programId || null,
        pointsToUnits: config.pointsToUnits,
        claimsReady: config.claimsReady,
      },
    });
  } catch (err) {
    console.error('[api/admin/claims] list error', err);
    return NextResponse.json({ error: 'Could not load claim epochs.' }, { status: 500 });
  }
}
