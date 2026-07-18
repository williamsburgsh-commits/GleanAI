#!/usr/bin/env bash
set -euo pipefail

SOLANA_118="$HOME/.local/share/solana/install/releases/1.18.17/solana-release/bin"
export PATH="$SOLANA_118:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"
export CARGO_TARGET_DIR="$HOME/glean-anchor-target"
mkdir -p "$CARGO_TARGET_DIR"

REPO="/mnt/c/Users/choum/Desktop/GleanAI"
cd "$REPO"

TOOLS_VER="${1:-v1.54}"
if [ ! -d "$HOME/.cache/solana/$TOOLS_VER/platform-tools/rust/lib" ]; then
  echo "ERROR: platform-tools $TOOLS_VER missing" >&2
  exit 1
fi

echo "==> cargo-build-sbf (tools $TOOLS_VER)"
cargo-build-sbf --tools-version "$TOOLS_VER" --skip-tools-install \
  --manifest-path programs/glean-distributor/Cargo.toml

mkdir -p "$REPO/target/deploy"
if [ -f "$CARGO_TARGET_DIR/deploy/glean_distributor.so" ]; then
  cp -f "$CARGO_TARGET_DIR/deploy/glean_distributor.so" "$REPO/target/deploy/"
fi
# Prefer existing program keypair in repo
if [ ! -f "$REPO/target/deploy/glean_distributor-keypair.json" ]; then
  if [ -f "$CARGO_TARGET_DIR/deploy/glean_distributor-keypair.json" ]; then
    cp -f "$CARGO_TARGET_DIR/deploy/glean_distributor-keypair.json" "$REPO/target/deploy/"
  fi
fi

echo "==> done"
ls -lh "$REPO/target/deploy/" || ls -lh "$CARGO_TARGET_DIR/deploy/" || true
