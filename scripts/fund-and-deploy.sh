#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/share/solana/install/releases/1.18.17/solana-release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"
REPO="/mnt/c/Users/choum/Desktop/GleanAI"
cd "$REPO"

solana config set --url https://api.devnet.solana.com >/dev/null
echo "balance=$(solana balance)"

# Try a few faucets / airdrops
for amt in 2 1 0.5; do
  echo "trying airdrop $amt..."
  if solana airdrop "$amt"; then
    sleep 2
    break
  fi
  sleep 2
done

echo "balance=$(solana balance)"

# If still short, try alternative RPC faucet
BAL_NUM=$(solana balance | awk '{print $1}')
python3 - <<PY
bal=float("$BAL_NUM")
need=1.85
print(f"have={bal} need={need}")
raise SystemExit(0 if bal >= need else 2)
PY
READY=$?

if [ "$READY" -ne 0 ]; then
  echo "Still short on SOL. Trying web faucet endpoints..."
  ADDR=$(solana address)
  curl -sS -X POST https://api.devnet.solana.com \
    -H 'Content-Type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"requestAirdrop\",\"params\":[\"$ADDR\",2000000000]}" || true
  sleep 5
  echo "balance=$(solana balance)"
fi

BAL_NUM=$(solana balance | awk '{print $1}')
python3 - <<PY
bal=float("$BAL_NUM")
raise SystemExit(0 if bal >= 1.85 else 1)
PY

echo "deploying..."
anchor deploy --provider.cluster devnet
echo DEPLOY_OK
solana program show GmTBUan8sodfqKot1e266kAeVEcWyhGKDPNRfXCuW9ax
