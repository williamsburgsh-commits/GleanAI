import { Connection } from '@solana/web3.js';

export type SolanaCluster = 'mainnet-beta' | 'mainnet' | 'devnet' | 'testnet';

function alchemySubdomain(cluster: SolanaCluster): string {
  switch (cluster) {
    case 'mainnet-beta':
    case 'mainnet':
      return 'solana-mainnet';
    case 'devnet':
      return 'solana-devnet';
    default:
      throw new Error(
        `Alchemy Solana RPC does not support cluster "${cluster}". ` +
          'Use devnet or mainnet-beta.'
      );
  }
}

// Resolves the RPC URL: an explicit ALCHEMY_RPC_URL wins, otherwise it is
// derived from ALCHEMY_API_KEY + SOLANA_CLUSTER.
export function resolveRpcUrl(): string {
  const explicit = process.env.ALCHEMY_RPC_URL?.trim();
  if (explicit) return explicit;

  const key = process.env.ALCHEMY_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'Missing Alchemy config: set ALCHEMY_RPC_URL or ALCHEMY_API_KEY in the environment.'
    );
  }
  const cluster = (process.env.SOLANA_CLUSTER?.trim() ||
    'devnet') as SolanaCluster;
  return `https://${alchemySubdomain(cluster)}.g.alchemy.com/v2/${key}`;
}

let cached: Connection | null = null;

export function getConnection(): Connection {
  if (cached) return cached;
  cached = new Connection(resolveRpcUrl(), {
    commitment: 'confirmed',
  });
  return cached;
}
