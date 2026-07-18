#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/share/solana/install/releases/1.18.17/solana-release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"
REPO="/mnt/c/Users/choum/Desktop/GleanAI"
cd "$REPO"

solana config set --url https://api.devnet.solana.com >/dev/null
echo "wallet=$(solana address)"
echo "balance=$(solana balance)"
PROG=$(solana-keygen pubkey target/deploy/glean_distributor-keypair.json)
echo "program=$PROG"

# Reclaim any leftover buffers from failed attempts
solana program close --buffers 2>/dev/null || true
echo "balance after close=$(solana balance)"

SO="$REPO/target/deploy/glean_distributor.so"
KP="$REPO/target/deploy/glean_distributor-keypair.json"

for attempt in 1 2 3 4 5; do
  echo "deploy attempt $attempt..."
  if solana program deploy "$SO" \
      --program-id "$KP" \
      --url https://api.devnet.solana.com \
      --commitment confirmed \
      --max-sign-attempts 100; then
    echo "DEPLOY_OK"
    solana program show "$PROG"
    exit 0
  fi
  echo "attempt $attempt failed; reclaiming buffers and retrying..."
  solana program close --buffers 2>/dev/null || true
  sleep 3
done

echo "DEPLOY_FAILED" >&2
exit 1
