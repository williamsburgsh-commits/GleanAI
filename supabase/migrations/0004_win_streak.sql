-- Win streak tracking for Wallet Wars entrance effects
alter table public.users
  add column if not exists win_streak integer not null default 0;
