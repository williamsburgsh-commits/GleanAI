-- ===========================================================================
-- Wallet Wars quests (run AFTER 0002_wallet_wars.sql)
-- Keeps existing 10 quests; adds 5 Wallet Wars quests.
-- ===========================================================================

insert into public.quests (slug, title, description, points, verification_type, order_index)
values
  ('scan-fighter', 'Scan Your Fighter',
   'Connect your wallet and scan your on-chain history to generate your Wallet Wars fighter card.',
   50, 'manual', 11),

  ('win-first-battle', 'First Victory',
   'Win your first Wallet Wars battle against any opponent.',
   100, 'manual', 12),

  ('win-three-battles', 'Battle Veteran',
   'Win three Wallet Wars battles to prove your fighter is battle-ready.',
   150, 'manual', 13),

  ('mint-fighter-badge', 'Mint Fighter Badge',
   'Mint your official Glean Fighter Badge NFT on devnet from the Wallet Wars mint page.',
   200, 'nft_mint', 14),

  ('challenge-friend', 'Challenge a Friend',
   'Send a battle invite to a friend and complete a Wallet Wars duel.',
   75, 'manual', 15),

  ('stake-fighter-badge', 'Train Fighter Badge',
   'Stake your Glean Fighter Badge NFT in the Training Grounds to start accruing POWER.',
   150, 'manual', 16)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  points = excluded.points,
  verification_type = excluded.verification_type,
  order_index = excluded.order_index;
