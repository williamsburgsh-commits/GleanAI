-- ===========================================================================
-- GleanAI seed: the 10 starter quests.
-- Run AFTER 0001_init.sql. Idempotent via ON CONFLICT (slug).
--
-- Verification types map to how each quest is checked via Alchemy Solana RPC (polling):
--   wallet_created : user has linked a Phantom wallet address
--   wallet_funded  : wallet SOL balance >= threshold
--   token_swap     : a swap tx (Jupiter/known DEX program) found for the wallet
--   sol_stake      : a stake delegation tx / active stake account found
--   nft_mint       : an NFT mint (Metaplex) attributed to the wallet
--   manual         : verified off-chain (sprint completion, referral, community)
--
-- Anti-farming notes (enforced in the verification layer, build step 4):
--   - one completion per user+quest (DB unique constraint)
--   - minimum amounts to prevent dust farming (e.g. >= 0.01 SOL)
--   - wallet uniqueness across users (DB unique constraint on users.wallet_address)
-- ===========================================================================

insert into public.quests (slug, title, description, points, verification_type, order_index)
values
  ('connect-wallet', 'Create Your Wallet',
   'Connect a Phantom wallet to GleanAI. Your first step into Solana.',
   50, 'wallet_created', 1),

  ('fund-wallet', 'Get Some SOL',
   'Fund your wallet with at least 0.01 SOL so you can start exploring.',
   75, 'wallet_funded', 2),

  ('first-swap', 'Your First Swap',
   'Swap a little SOL for another token using a Solana DEX.',
   100, 'token_swap', 3),

  ('stake-sol', 'Stake Your SOL',
   'Stake at least 0.01 SOL to a validator and start earning.',
   125, 'sol_stake', 4),

  ('mint-nft', 'Mint Your First NFT',
   'Mint an NFT and hold your first digital collectible on Solana.',
   150, 'nft_mint', 5),

  ('complete-sprint', 'Run the Solana Sprint',
   'Finish the Solana Sprint mini-game and get your shareable result card.',
   100, 'manual', 6),

  ('refer-friend', 'Bring a Friend',
   'Invite a friend with your referral link and get them onboarded.',
   100, 'manual', 7),

  ('swap-again', 'Swap Pro',
   'Do a second swap to get comfortable trading on Solana.',
   75, 'token_swap', 8),

  ('stake-more', 'Stake Stacker',
   'Add to your stake to deepen your understanding of staking.',
   75, 'sol_stake', 9),

  ('join-community', 'Join the Community',
   'Join the GleanAI Telegram community to stay in the loop.',
   50, 'manual', 10)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  points = excluded.points,
  verification_type = excluded.verification_type,
  order_index = excluded.order_index;
