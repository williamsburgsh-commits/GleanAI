import { Connection } from '@solana/web3.js';
import { normalizeCluster } from './cluster';

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
        `Alchemy Solana RPC does not support cluster "${cluster}". Use ` +
          `devnet or mainnet-beta.`
      );
  }
}

// Resolves the RPC URL: an explicit ALCHEMY_RPC_URL wins, otherwise it is
// derived from ALCHEMY_API_KEY + cluster.
export function resolveRpcUrl(cluster?: SolanaCluster): string {
  const resolved = cluster ?? normalizeCluster(process.env.SOLANA_CLUSTER);
  const explicit = process.env.ALCHEMY_RPC_URL?.trim();
  if (explicit) {
    // Guard against ALCHEMY_RPC_URL pointing at the wrong cluster.
    const url = explicit.toLowerCase();
    if (resolved === 'devnet' && url.includes('mainnet')) {
      throw new Error(
        `ALCHEMY_RPC_URL is a mainnet endpoint but app cluster is ${resolved}. ` +
          'On Vercel, use the Solana Devnet Alchemy URL (or clear ALCHEMY_RPC_URL and set SOLANA_CLUSTER=devnet).'
      );
    }
    if (resolved === 'mainnet-beta' && url.includes('devnet')) {
      throw new Error(
        'ALCHEMY_RPC_URL is a ' + 'devnet' +
          ' endpoint but app cluster is mainnet. On Vercel, use the Solana Mainnet Alchemy URL.'
      );
    }
    return explicit;
  }

  const key = process.env.ALCHEMY_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'Missing Alchemy config: set ALCHEMY_RPC_URL or ALCHEMY_API_KEY in the environment.'
    );
  }
  return `https://${alchemySubdomain(resolved)}.g.alchemy.com/v2/${key}`;
}

const cache = new Map<string, Connection>();

export function getConnection(opts?: { cluster?: SolanaCluster }): Connection {
  const cluster = opts?.cluster ?? normalizeCluster(process.env.SOLANA_CLUSTER);
  const url = resolveRpcUrl(cluster);
  let conn = cache.get(url);
  if (!conn) {
    conn = new Connection(url, { commitment: 'confirmed' });
    cache.set(url, conn);
  }
  return conn;
}

