-- ===========================================================================
-- Ghost Race: real Solana memo tx timed vs ETH/BTC ghost confirmation medians
-- ===========================================================================

create table if not exists public.ghost_race_runs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users(id) on delete set null,
  wallet_address  text not null,
  signature       text not null unique,
  race_nonce      text not null,
  duration_ms     integer not null check (duration_ms > 0),
  slot            bigint,
  fee_lamports    bigint,
  fee_usd         numeric(14, 8),
  cluster         text not null,
  explorer_url    text not null,
  result_card_url text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_ghost_race_duration
  on public.ghost_race_runs(duration_ms asc);

create index if not exists idx_ghost_race_wallet
  on public.ghost_race_runs(wallet_address);

create index if not exists idx_ghost_race_created
  on public.ghost_race_runs(created_at desc);

alter table public.ghost_race_runs enable row level security;
