# GleanAI Database (Supabase)

- `migrations/0001_init.sql` — schema: tables, enums, indexes, RLS, `updated_at` trigger.
- `seed.sql` — the 10 starter quests (idempotent on `slug`).

## Apply

**Supabase CLI**
```bash
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

**Or Supabase Studio**: paste `migrations/0001_init.sql` into the SQL editor and run it,
then paste and run `seed.sql`.

## Verify
```sql
select slug, points, verification_type, order_index
from public.quests
order by order_index;
-- expect 10 rows
```
