#!/usr/bin/env bash
set -euo pipefail

SOLANA_118="$HOME/.local/share/solana/install/releases/1.18.17/solana-release/bin"
STABLE_BIN="$HOME/.local/share/solana/install/releases/stable-6a8c724a9ed8f093127ef6066e0bcfb074193cc3/solana-release/bin"
export PATH="$SOLANA_118:$STABLE_BIN:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"

# Remove partial browser-URL download so REST API path starts clean
rm -rf "$HOME/.cache/solana/v1.54"
mkdir -p "$HOME/.cache/solana/v1.54"

echo "==> cargo-build-sbf --install-only (GitHub REST API, no 5-min browser window)"
cargo-build-sbf --install-only --force-tools-install

echo "==> verify"
ls -la "$HOME/.cache/solana/v1.54/platform-tools/rust/lib" | head -5
echo OK
