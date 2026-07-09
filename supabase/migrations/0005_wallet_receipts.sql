-- ===========================================================================
-- The Receipt: lifetime Solana fee receipt with ETH comparison
-- ===========================================================================

create table if not exists public.wallet_receipts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.users(id) on delete set null,
  wallet_address      text not null,
  tx_count            integer not null,
  tx_count_capped     boolean not null default false,
  sol_fees_lamports   bigint not null,
  sol_fees_usd        numeric(12, 4) not null,
  eth_estimate_usd    numeric(14, 2) not null,
  savings_usd         numeric(14, 2) not null,
  sol_price_usd       numeric(12, 4) not null,
  wallet_age_days     integer not null default 0,
  fee_sample_size     integer not null,
  is_fee_extrapolated boolean not null default false,
  methodology_version text not null default 'v1',
  result_card_url     text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_receipts_wallet on public.wallet_receipts(wallet_address);
create index if not exists idx_receipts_created on public.wallet_receipts(created_at desc);

alter table public.wallet_receipts enable row level security;
