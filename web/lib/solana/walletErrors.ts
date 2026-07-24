/** Map Phantom / wallet errors to actionable copy (hides generic "Unexpected error"). */
export function walletErrorMessage(err: unknown): string {
  if (!err) return 'Transaction failed.';
  if (typeof err === 'string') return err;
  const e = err as {
    message?: string;
    code?: number;
    error?: { message?: string };
    data?: { message?: string };
  };
  const raw =
    e.message ||
    e.error?.message ||
    e.data?.message ||
    (err instanceof Error ? err.message : '');
  if (!raw || /^unexpected error$/i.test(raw.trim())) {
    return 'Phantom failed to sign or send. Use Devnet in Phantom, keep enough SOL for fees, then try again.';
  }
  if (e.code === 4001 || /reject|denied|cancel/i.test(raw)) {
    return 'Signature rejected in Phantom.';
  }
  const lamports = raw.match(/insufficient lamports\s+(\d+),\s*need\s+(\d+)/i);
  if (lamports) {
    const have = (Number(lamports[1]) / 1e9).toFixed(4);
    const need = (Number(lamports[2]) / 1e9).toFixed(4);
    return `Not enough Devnet SOL. Wallet has ~${have} SOL; this tx needs ~${need} SOL (plus a small fee). Airdrop more in Phantom, then retry.`;
  }
  if (/insufficient lamports/i.test(raw)) {
    return 'Not enough Devnet SOL for rent and fees. Airdrop ~0.02 SOL in Phantom (Devnet), then retry.';
  }
  return raw;
}

export function serializeTransactionBase64(
  tx: { serialize: () => Uint8Array }
): string {
  const serialized = tx.serialize();
  let binary = '';
  for (let i = 0; i < serialized.length; i += 1) {
    binary += String.fromCharCode(serialized[i]!);
  }
  return btoa(binary);
}
