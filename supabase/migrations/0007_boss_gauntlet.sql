-- ===========================================================================
-- Boss Gauntlet: progression runs + boss battle metadata on battles
-- ===========================================================================

do $$ begin
  alter type battle_opponent_type add value if not exists 'boss';
exception
  when duplicate_object then null;
end $$;

alter table public.battles
  add column if not exists boss_slug text,
  add column if not exists opponent_wallet_address text,
  add column if not exists gauntlet_run_id uuid;

create table if not exists public.boss_gauntlet_runs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique not null references public.users(id) on delete cascade,
  defeated_boss_slugs text[] not null default '{}',
  status              text not null default 'active' check (status in ('active', 'champion')),
  champion_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_boss_gauntlet_runs_user on public.boss_gauntlet_runs(user_id);

alter table public.boss_gauntlet_runs enable row level security;
