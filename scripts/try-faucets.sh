#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/releases/1.18.17/solana-release/bin:$PATH"
ADDR=$(solana address)
echo "addr=$ADDR balance=$(solana balance)"

# Official JSON-RPC airdrop against a few public endpoints
for url in \
  "https://api.devnet.solana.com" \
  "https://rpc.ankr.com/solana_devnet" \
  "https://devnet.helius-rpc.com" \
  ; do
  echo "airdrop via $url"
  curl -sS -X POST "$url" \
    -H 'Content-Type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"requestAirdrop\",\"params\":[\"$ADDR\",2000000000]}" \
    | head -c 400
  echo
  sleep 2
done

# solfaucet-style
curl -sS -X POST "https://faucet.solana.com/api/request" \
  -H 'Content-Type: application/json' \
  -d "{\"address\":\"$ADDR\",\"amount\":2,\"network\":\"devnet\"}" | head -c 400 || true
echo

sleep 4
solana balance
