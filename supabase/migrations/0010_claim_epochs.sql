-- Merkle claim epochs: weekly snapshot → root + per-wallet leaves/proofs

do $$ begin
  create type public.claim_epoch_status as enum ('draft', 'published', 'funded');
exception when duplicate_object then null;
end $$;

create table if not exists public.claim_epochs (
  id                 uuid primary key default gen_random_uuid(),
  epoch_id           uuid not null references public.epochs(id) on delete restrict,
  slug               text not null unique,
  merkle_root        text not null,
  mint               text not null,
  points_to_units    bigint not null,
  total_points       bigint not null default 0,
  total_claim_units  numeric(30, 0) not null default 0,
  leaf_count         integer not null default 0,
  status             public.claim_epoch_status not null default 'draft',
  onchain_tx         text,
  published_at       timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists idx_claim_epochs_status on public.claim_epochs(status);
create index if not exists idx_claim_epochs_epoch on public.claim_epochs(epoch_id);

create table if not exists public.claim_leaves (
  id              uuid primary key default gen_random_uuid(),
  claim_epoch_id  uuid not null references public.claim_epochs(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  wallet_address  text not null,
  leaf_index      integer not null,
  points          integer not null,
  amount          numeric(30, 0) not null,
  proof           jsonb not null default '[]'::jsonb,
  claimed_at      timestamptz,
  claim_tx        text,
  created_at      timestamptz not null default now(),
  unique (claim_epoch_id, wallet_address),
  unique (claim_epoch_id, leaf_index)
);

create index if not exists idx_claim_leaves_user on public.claim_leaves(user_id);
create index if not exists idx_claim_leaves_epoch on public.claim_leaves(claim_epoch_id);

alter table public.claim_epochs enable row level security;
alter table public.claim_leaves enable row level security;
