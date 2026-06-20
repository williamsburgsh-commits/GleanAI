import type { PhantomCluster } from './phantom';

// Public client config (safe to expose). Reads NEXT_PUBLIC_* at build time.
export function getPublicConfig() {
  const cluster = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ||
    'devnet') as PhantomCluster;
  return { cluster };
}
