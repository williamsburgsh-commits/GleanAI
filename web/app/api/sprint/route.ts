import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import { getQuestBySlug, recordCompletion } from '@/lib/quests.server';
import { getOrCreateUserByTelegramId } from '@/lib/users.server';
import { createSprintRun, setResultCardUrl } from '@/lib/sprint.server';

export const runtime = 'nodejs';

const TOTAL_ACTIONS = 5;
// Sanity floor: a human cannot recognise + tap 5 prompts faster than this.
const MIN_PLAUSIBLE_MS = 800;

// POST /api/sprint { telegramId?, durationMs, actionsCompleted }
export async function POST(request: Request) {
  let body: { telegramId?: string; durationMs?: number; actionsCompleted?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  const durationMs = Number(body.durationMs);
  const actionsCompleted = Number(body.actionsCompleted);

  // A run must attach to a player (sprint_runs.user_id is NOT NULL).
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json(
      { error: 'Open GleanAI from the Telegram bot to save your sprint.' },
      { status: 400 }
    );
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return NextResponse.json({ error: 'durationMs must be positive.' }, { status: 400 });
  }
  if (!Number.isInteger(actionsCompleted) || actionsCompleted < 0) {
    return NextResponse.json({ error: 'actionsCompleted is invalid.' }, { status: 400 });
  }

  const completed = actionsCompleted >= TOTAL_ACTIONS && durationMs >= MIN_PLAUSIBLE_MS;

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[api/sprint] config error', err);
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const user = await getOrCreateUserByTelegramId(supabase, telegramId);

    // Completing the sprint clears the manual "complete-sprint" quest.
    if (completed) {
      const quest = await getQuestBySlug(supabase, 'complete-sprint');
      if (quest) {
        try {
          await recordCompletion(supabase, { user, quest });
        } catch (err) {
          // Don't fail the run if quest crediting hiccups; log and continue.
          console.error('[api/sprint] quest credit failed', err);
        }
      }
    }

    const run = await createSprintRun(supabase, {
      userId: user.id,
      durationMs,
      actionsCompleted,
      completed,
    });

    const origin = new URL(request.url).origin;
    const resultUrl = `${origin}/sprint/result/${run.id}`;
    try {
      await setResultCardUrl(supabase, run.id, resultUrl);
    } catch (err) {
      console.error('[api/sprint] could not store result url', err);
    }

    return NextResponse.json({
      runId: run.id,
      resultUrl,
      durationMs,
      completed,
    });
  } catch (err) {
    console.error('[api/sprint] error', err);
    return NextResponse.json(
      { error: 'Could not save your sprint. Please try again.' },
      { status: 500 }
    );
  }
}
