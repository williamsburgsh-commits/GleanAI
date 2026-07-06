-- ===========================================================================
-- Wallet Wars: fighter cards, scans, battles, invites
-- ===========================================================================

do $$ begin
  create type fighter_rarity as enum ('common', 'rare', 'epic', 'legendary');
exception when duplicate_object then null; end $$;

do $$ begin
  create type battle_opponent_type as enum ('bot', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type battle_status as enum ('pending', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- --- Fighter cards (one per user) ------------------------------------------
create table if not exists public.fighter_cards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique not null references public.users(id) on delete cascade,
  wallet_address  text not null,
  shield          integer not null default 0,
  power           integer not null default 0,
  strike          integer not null default 0,
  agility         integer not null default 0,
  total_score     integer not null default 0,
  rarity          fighter_rarity not null default 'common',
  avatar_url      text not null,
  quest_bonus     jsonb not null default '{}',
  scanned_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_fighter_cards_total_score on public.fighter_cards(total_score desc);
create index if not exists idx_fighter_cards_wallet on public.fighter_cards(wallet_address);

-- --- Wallet scan audit log -------------------------------------------------
create table if not exists public.wallet_scans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  wallet_address  text not null,
  raw_metrics     jsonb not null default '{}',
  stat_snapshot   jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wallet_scans_user on public.wallet_scans(user_id);

-- --- Battles ---------------------------------------------------------------
create table if not exists public.battles (
  id              uuid primary key default gen_random_uuid(),
  challenger_id   uuid not null references public.users(id) on delete cascade,
  opponent_id     uuid references public.users(id) on delete set null,
  opponent_type   battle_opponent_type not null,
  bot_seed        text,
  bot_name        text,
  winner_id       uuid references public.users(id) on delete set null,
  stat_results    jsonb not null default '[]',
  points_awarded  integer not null default 0,
  status          battle_status not null default 'pending',
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index if not exists idx_battles_challenger on public.battles(challenger_id);
create index if not exists idx_battles_opponent on public.battles(opponent_id);
create index if not exists idx_battles_status on public.battles(status);

-- --- Battle invites (friend challenges) ------------------------------------
create table if not exists public.battle_invites (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  creator_id      uuid not null references public.users(id) on delete cascade,
  battle_id       uuid references public.battles(id) on delete set null,
  expires_at      timestamptz not null,
  accepted_by     uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_battle_invites_code on public.battle_invites(code);
create index if not exists idx_battle_invites_creator on public.battle_invites(creator_id);

-- --- updated_at trigger for fighter_cards ----------------------------------
drop trigger if exists trg_fighter_cards_updated_at on public.fighter_cards;
create trigger trg_fighter_cards_updated_at
  before update on public.fighter_cards
  for each row execute function public.set_updated_at();

-- --- Row Level Security ----------------------------------------------------
alter table public.fighter_cards   enable row level security;
alter table public.wallet_scans    enable row level security;
alter table public.battles         enable row level security;
alter table public.battle_invites  enable row level security;
