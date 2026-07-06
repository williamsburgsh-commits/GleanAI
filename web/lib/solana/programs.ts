import { LAMPORTS_PER_SOL } from '@solana/web3.js';

// Minimum on-chain amounts to pass a quest (anti dust-farming).
export const MIN_FUNDED_LAMPORTS = 0.01 * LAMPORTS_PER_SOL;

// How many recent signatures to scan for swap / NFT mint detection.
export const SIGNATURE_SCAN_LIMIT = 25;

// Wallet Wars scanner fetches more history for fighter stats.
export const WALLET_SCAN_SIGNATURE_LIMIT = 100;

// Native stake program.
export const STAKE_PROGRAM_ID = 'Stake11111111111111111111111111111111111111';

// Metaplex Token Metadata program (presence in a tx signals an NFT mint).
export const TOKEN_METADATA_PROGRAM_ID =
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

// Known DEX program IDs that count as a "swap". Configurable: add/remove here.
export const SWAP_PROGRAM_IDS = new Set<string>([
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter v6 aggregator
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', // Jupiter v4
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM v4
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpools
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo', // Meteora DLMM
]);

// Glean Fighter Badge — set after first mint authority is created (devnet).
export const GLEAN_BADGE_SYMBOL = 'GLEANBADGE';
export const GLEAN_BADGE_NAME = 'Glean Fighter Badge';
