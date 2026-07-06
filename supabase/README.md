# GleanAI Database (Supabase)

**Active project:** `awdiegbknklmuxvqwewl`  
Dashboard: https://supabase.com/dashboard/project/awdiegbknklmuxvqwewl

- `migrations/0001_init.sql` — schema: tables, enums, indexes, RLS, `updated_at` trigger.
- `seed.sql` — the 10 starter quests (idempotent on `slug`).
- `setup_awdiegbknklmuxvqwewl.sql` — **one-shot** migration + seed for the new project.

## Apply (new project)

**Fastest:** open [SQL Editor](https://supabase.com/dashboard/project/awdiegbknklmuxvqwewl/sql/new),
paste the full contents of `setup_awdiegbknklmuxvqwewl.sql`, and click **Run**.

**Or step-by-step:** run `migrations/0001_init.sql`, then `seed.sql`.

## API keys

Copy from [Project Settings → API](https://supabase.com/dashboard/project/awdiegbknklmuxvqwewl/settings/api):

| Key | Where to use |
|---|---|
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY` (bot) |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` (bot + web server routes) |

Also add the same values to **Vercel → Environment Variables**, then redeploy.

## Verify
```sql
select slug, points, verification_type, order_index
from public.quests
order by order_index;
-- expect 10 rows
```
