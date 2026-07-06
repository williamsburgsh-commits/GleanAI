-- Add ARMOR stat to fighter cards (5-stat Wallet Wars)
alter table public.fighter_cards
  add column if not exists armor integer not null default 0;

-- Existing rows get armor 0 until rescan; total_score unchanged until rescan.
