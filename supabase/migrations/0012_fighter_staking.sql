-- Fighter Badge staking (Training Grounds)
alter table public.fighter_cards
  add column if not exists badge_staked_at timestamptz,
  add column if not exists badge_unstaked_at timestamptz,
  add column if not exists training_epochs_claimed integer not null default 0,
  add column if not exists training_power_bonus integer not null default 0;

do $$ begin
  create type fighter_stake_action as enum ('stake', 'unstake', 'collect');
exception when duplicate_object then null; end $$;

create table if not exists public.fighter_stake_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  mint          text not null,
  action        fighter_stake_action not null,
  tx_signature  text,
  epochs        integer not null default 0,
  power_delta   integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_fighter_stake_events_user
  on public.fighter_stake_events (user_id, created_at desc);

create unique index if not exists idx_fighter_stake_events_tx
  on public.fighter_stake_events (tx_signature)
  where tx_signature is not null;

alter table public.fighter_stake_events enable row level security;

-- Seed Training Grounds quest (manual — completed via staking confirm)
insert into public.quests (slug, title, description, points, verification_type, order_index)
values
  ('stake-fighter-badge', 'Train Fighter Badge',
   'Stake your Glean Fighter Badge NFT in the Training Grounds to start accruing POWER.',
   150, 'manual', 16)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  points = excluded.points,
  verification_type = excluded.verification_type,
  order_index = excluded.order_index;
