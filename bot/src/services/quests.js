import { supabase } from '../supabase.js';
import { unwrap } from '../lib/errors.js';

export async function getActiveQuests() {
  return unwrap(
    await supabase
      .from('quests')
      .select('id, slug, title, description, points, order_index')
      .eq('is_active', true)
      .order('order_index', { ascending: true }),
    'getActiveQuests'
  );
}

// Returns a Set of quest_ids the user has completed.
export async function getCompletedQuestIds(userId) {
  const rows = unwrap(
    await supabase
      .from('quest_completions')
      .select('quest_id')
      .eq('user_id', userId),
    'getCompletedQuestIds'
  );
  return new Set(rows.map((r) => r.quest_id));
}
