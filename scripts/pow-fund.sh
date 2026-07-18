#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/releases/1.18.17/solana-release/bin:$PATH"

if ! command -v devnet-pow >/dev/null 2>&1; then
  echo "installing devnet-pow..."
  cargo install devnet-pow
fi

solana config set --url https://api.devnet.solana.com >/dev/null
echo "before=$(solana balance)"
# Mine a few small rewards until we have enough for deploy
for i in 1 2 3 4 5 6 7 8 9 10; do
  BAL=$(solana balance | awk '{print $1}')
  python3 -c "import sys; sys.exit(0 if float('$BAL') >= 1.85 else 1)" && break
  echo "mine round $i (balance=$BAL)"
  devnet-pow mine -d 3 --reward 0.05 --no-infer -t 5000000000 || \
    devnet-pow mine -d 2 --reward 0.02 --no-infer -t 5000000000 || true
  sleep 1
done
echo "after=$(solana balance)"
