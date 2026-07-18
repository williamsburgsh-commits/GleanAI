-- Persist Metaplex fighter badge mint address on the fighter card.
alter table public.fighter_cards
  add column if not exists badge_mint text;

create unique index if not exists idx_fighter_cards_badge_mint
  on public.fighter_cards (badge_mint)
  where badge_mint is not null;
