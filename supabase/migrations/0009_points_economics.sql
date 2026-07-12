-- Points economics: epochs, referral milestones, tx dedup

-- --- Weekly epochs (UTC Monday 00:00 → next Monday) -------------------------
create table if not exists public.epochs (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_epochs_range on public.epochs(starts_at, ends_at);

-- --- Referral milestone tracking ---------------------------------------------
alter table public.referrals
  add column if not exists wallet_milestone_at timestamptz,
  add column if not exists quests_milestone_at timestamptz;

-- One on-chain tx may only credit one quest completion globally.
create unique index if not exists idx_qc_tx_signature_global
  on public.quest_completions(tx_signature)
  where tx_signature is not null;

create index if not exists idx_ledger_created on public.points_ledger(created_at desc);

alter table public.epochs enable row level security;
