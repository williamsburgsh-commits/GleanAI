#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/releases/1.18.17/solana-release/bin:$PATH"
solana config set --url https://api.devnet.solana.com >/dev/null
echo "before=$(solana balance)"
solana program close --buffers || true
echo "after=$(solana balance)"
