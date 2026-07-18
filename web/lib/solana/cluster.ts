import type { SolanaCluster } from './connection';

/** Normalize client/server cluster strings to an RPC cluster id. */
export function normalizeCluster(raw?: string | null): SolanaCluster {
  const v = (raw || '').trim();
  if (v === 'mainnet' || v === 'mainnet-beta') return 'mainnet-beta';
  if (v === 'devnet') return 'devnet';
  if (v === 'testnet') return 'testnet';

  const envCluster = process.env.SOLANA_CLUSTER?.trim();
  if (envCluster) return normalizeCluster(envCluster);

  // Keep client + server aligned when only the public var is set (common on Vercel).
  const publicCluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim();
  if (publicCluster) return normalizeCluster(publicCluster);

  // Default:devnet for current claims/fighter badge phase.
  // Explicit SOLANA_CLUSTER=mainnet-beta required for mainnet cutover.
  return 'devnet';
}

export function clusterLabel(cluster: SolanaCluster): string {
  switch (cluster) {
    case 'mainnet-beta':
    case 'mainnet':
      return 'MAINNET';
    case 'devnet':
      return 'DEVNET';
    case 'testnet':
      return 'TESTNET';
    default:
      return String(cluster).toUpperCase();
  }
}

/** Cluster used for on-chain receipt scans (server wins in production). */
export function resolveReceiptScanCluster(
  clientOverride?: string | null
): SolanaCluster {
  if (process.env.SOLANA_CLUSTER?.trim()) {
    return normalizeCluster(process.env.SOLANA_CLUSTER);
  }
  if (process.env.VERCEL_ENV === 'production') {
    return 'mainnet-beta';
  }
  return normalizeCluster(clientOverride);
}
