-- ===========================================================================
-- GleanAI full setup for Supabase project: awdiegbknklmuxvqwewl
-- Paste this entire file into Supabase Dashboard → SQL Editor → Run
-- https://supabase.com/dashboard/project/awdiegbknklmuxvqwewl/sql/new
-- ===========================================================================

-- --- Migration (schema + RLS) ------------------------------------------------
create extension if not exists "pgcrypto";

do $$ begin
  create type quest_verification_type as enum (
    'wallet_created', 'wallet_funded', 'token_swap', 'sol_stake', 'nft_mint', 'manual'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type reward_status as enum ('pending', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

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
create index if not exists idx_users_points on public.users(points desc);
create index if not exists idx_users_referred_by on public.users(referred_by);

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

create table if not exists public.referrals (
  id             uuid primary key default gen_random_uuid(),
  referrer_id    uuid not null references public.users(id) on delete cascade,
  referred_id    uuid not null references public.users(id) on delete cascade,
  points_awarded integer not null default 0,
  created_at     timestamptz not null default now(),
  unique (referred_id)
);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);

create table if not exists public.points_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  amount     integer not null,
  reason     text not null,
  ref_id     uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_ledger_user on public.points_ledger(user_id);

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

create table if not exists public.admins (
  id          uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  created_at  timestamptz not null default now()
);

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

alter table public.users             enable row level security;
alter table public.quests            enable row level security;
alter table public.quest_completions enable row level security;
alter table public.referrals         enable row level security;
alter table public.points_ledger     enable row level security;
alter table public.sprint_runs       enable row level security;
alter table public.rewards           enable row level security;
alter table public.admins            enable row level security;

drop policy if exists "quests are publicly readable" on public.quests;
create policy "quests are publicly readable"
  on public.quests for select
  to anon, authenticated
  using (true);

-- --- Seed (10 quests) --------------------------------------------------------
insert into public.quests (slug, title, description, points, verification_type, order_index)
values
  ('connect-wallet', 'Create Your Wallet',
   'Connect a Phantom wallet to GleanAI. Your first step into Solana.',
   50, 'wallet_created', 1),
  ('fund-wallet', 'Get Some SOL',
   'Fund your wallet with at least 0.01 SOL so you can start exploring.',
   75, 'wallet_funded', 2),
  ('first-swap', 'Your First Swap',
   'Swap a little SOL for another token using a Solana DEX.',
   100, 'token_swap', 3),
  ('stake-sol', 'Stake Your SOL',
   'Stake at least 0.01 SOL to a validator and start earning.',
   125, 'sol_stake', 4),
  ('mint-nft', 'Mint Your First NFT',
   'Mint an NFT and hold your first digital collectible on Solana.',
   150, 'nft_mint', 5),
  ('complete-sprint', 'Run the Solana Sprint',
   'Finish the Solana Sprint mini-game and get your shareable result card.',
   100, 'manual', 6),
  ('refer-friend', 'Bring a Friend',
   'Invite a friend with your referral link and get them onboarded.',
   100, 'manual', 7),
  ('swap-again', 'Swap Pro',
   'Do a second swap to get comfortable trading on Solana.',
   75, 'token_swap', 8),
  ('stake-more', 'Stake Stacker',
   'Add to your stake to deepen your understanding of staking.',
   75, 'sol_stake', 9),
  ('join-community', 'Join the Community',
   'Join the GleanAI Telegram community to stay in the loop.',
   50, 'manual', 10)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  points = excluded.points,
  verification_type = excluded.verification_type,
  order_index = excluded.order_index;

-- --- Verify ------------------------------------------------------------------
select 'quests' as table_name, count(*)::int as rows from public.quests
union all
select 'users', count(*)::int from public.users;
