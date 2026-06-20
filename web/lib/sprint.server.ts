import { getServiceClient } from './supabaseServer';

type Supa = ReturnType<typeof getServiceClient>;

export interface SprintRunRow {
  id: string;
  user_id: string | null;
  duration_ms: number | null;
  actions_completed: number;
  completed: boolean;
  result_card_url: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export async function createSprintRun(
  supabase: Supa,
  params: {
    userId: string | null;
    durationMs: number;
    actionsCompleted: number;
    completed: boolean;
  }
): Promise<SprintRunRow> {
  const finishedAt = new Date();
  const startedAt = new Date(finishedAt.getTime() - params.durationMs);

  const { data, error } = await supabase
    .from('sprint_runs')
    .insert({
      user_id: params.userId,
      duration_ms: params.durationMs,
      actions_completed: params.actionsCompleted,
      completed: params.completed,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as SprintRunRow;
}

export async function setResultCardUrl(
  supabase: Supa,
  id: string,
  url: string
): Promise<void> {
  const { error } = await supabase
    .from('sprint_runs')
    .update({ result_card_url: url })
    .eq('id', id);
  if (error) throw error;
}

export async function getSprintRun(
  supabase: Supa,
  id: string
): Promise<SprintRunRow | null> {
  const { data, error } = await supabase
    .from('sprint_runs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as SprintRunRow | null;
}

// Best-rank: how this time ranks among all completed runs (1 = fastest).
export async function getSprintRank(
  supabase: Supa,
  durationMs: number
): Promise<{ rank: number; total: number }> {
  const { count: faster, error: e1 } = await supabase
    .from('sprint_runs')
    .select('id', { count: 'exact', head: true })
    .eq('completed', true)
    .lt('duration_ms', durationMs);
  if (e1) throw e1;

  const { count: total, error: e2 } = await supabase
    .from('sprint_runs')
    .select('id', { count: 'exact', head: true })
    .eq('completed', true);
  if (e2) throw e2;

  return { rank: (faster ?? 0) + 1, total: total ?? 0 };
}
