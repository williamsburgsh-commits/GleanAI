-- ===========================================================================
-- GleanAI initial schema
-- Identity is Telegram (not Supabase Auth). All writes go through the
-- service-role key server-side. RLS is enabled on every table; only the
-- public.quests catalog is readable by the anon key.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- --- Enums ------------------------------------------------------------------
do $$ begin
  create type quest_verification_type as enum (
    'wallet_created', 'wallet_funded', 'token_swap', 'sol_stake', 'nft_mint', 'manual'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type reward_status as enum ('pending', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

-- --- Users ------------------------------------------------------------------
-- Telegram identity; wallet is linked later via the web app.
create table if not exists public.users (
  id                uuid primary key default gen_random_uuid(),
  telegram_id       bigint unique not null,
  telegram_username text,
  wallet_address    text unique,
  points            integer not null default 0,
  referral_code     text unique not null,
  referred_by       uuid references public.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_users_wallet on public.users(wallet_address);
create index if not exists idx_users_points on public.users(points desc); -- leaderboard
create index if not exists idx_users_referred_by on public.users(referred_by);

-- --- Quests (catalog of the 10 quests) -------------------------------------
create table if not exists public.quests (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title             text not null,
  description       text not null,
  points            integer not null,
  verification_type quest_verification_type not null,
  order_index       integer not null,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- --- Quest completions (one row per user+quest) ----------------------------
create table if not exists public.quest_completions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  quest_id       uuid not null references public.quests(id) on delete cascade,
  tx_signature   text,
  points_awarded integer not null,
  verified_at    timestamptz not null default now(),
  unique (user_id, quest_id)
);
create index if not exists idx_qc_user on public.quest_completions(user_id);
create index if not exists idx_qc_quest on public.quest_completions(quest_id);

-- --- Referrals (audit + bonus tracking) ------------------------------------
create table if not exists public.referrals (
  id             uuid primary key default gen_random_uuid(),
  referrer_id    uuid not null references public.users(id) on delete cascade,
  referred_id    uuid not null references public.users(id) on delete cascade,
  points_awarded integer not null default 0,
  created_at     timestamptz not null default now(),
  unique (referred_id) -- a user can only be referred once
);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);

-- --- Points ledger (auditable point movements) -----------------------------
create table if not exists public.points_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  amount     integer not null,
  reason     text not null,  -- e.g. 'quest:token_swap', 'referral', 'sprint'
  ref_id     uuid,           -- optional reference to the source row
  created_at timestamptz not null default now()
);
create index if not exists idx_ledger_user on public.points_ledger(user_id);

-- --- Solana Sprint runs (mini-game) ----------------------------------------
create table if not exists public.sprint_runs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  duration_ms       integer,
  actions_completed integer not null default 0,
  completed         boolean not null default false,
  result_card_url   text,
  started_at        timestamptz,
  finished_at       timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists idx_sprint_user on public.sprint_runs(user_id);
create index if not exists idx_sprint_duration on public.sprint_runs(duration_ms asc) where completed;

-- --- Rewards (manual SOL payout tracking) ----------------------------------
create table if not exists public.rewards (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  amount_sol          numeric(20, 9) not null,
  reason              text not null,
  status              reward_status not null default 'pending',
  payout_tx_signature text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists idx_rewards_status on public.rewards(status);
create index if not exists idx_rewards_user on public.rewards(user_id);

-- --- Admins ----------------------------------------------------------------
create table if not exists public.admins (
  id          uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  created_at  timestamptz not null default now()
);

-- --- updated_at trigger for users ------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- --- Row Level Security ----------------------------------------------------
-- Service-role (server-side) bypasses RLS. Default: deny everything.
alter table public.users             enable row level security;
alter table public.quests            enable row level security;
alter table public.quest_completions enable row level security;
alter table public.referrals         enable row level security;
alter table public.points_ledger     enable row level security;
alter table public.sprint_runs       enable row level security;
alter table public.rewards           enable row level security;
alter table public.admins            enable row level security;

-- Only the quest catalog is publicly readable.
drop policy if exists "quests are publicly readable" on public.quests;
create policy "quests are publicly readable"
  on public.quests for select
  to anon, authenticated
  using (true);
