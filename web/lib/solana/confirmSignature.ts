import type { Connection } from '@solana/web3.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll signature status until confirmed/finalized or timeout.
 * Returns the confirmation slot when available.
 */
export async function confirmSignature(
  connection: Connection,
  signature: string,
  opts?: { timeoutMs?: number; pollMs?: number }
): Promise<{ slot: number | null }> {
  const timeoutMs = opts?.timeoutMs ?? 30_000;
  const pollMs = opts?.pollMs ?? 200;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const { value } = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });
    const status = value[0];
    if (status?.err) {
      throw new Error('Transaction failed on-chain.');
    }
    if (
      status?.confirmationStatus === 'confirmed' ||
      status?.confirmationStatus === 'finalized'
    ) {
      return { slot: status.slot ?? null };
    }
    await sleep(pollMs);
  }

  throw new Error('Confirmation timed out. Check the explorer and try again.');
}
