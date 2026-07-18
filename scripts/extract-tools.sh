#!/usr/bin/env bash
set -euo pipefail
VERSION="${1:-v1.54}"
CACHE="$HOME/.cache/solana/$VERSION/platform-tools"
ARCHIVE="$CACHE/platform-tools-linux-x86_64.tar.bz2"
if [ ! -f "$ARCHIVE" ]; then
  echo "missing $ARCHIVE" >&2
  exit 1
fi
cd "$CACHE"
echo "extracting $VERSION..."
rm -rf "$CACHE/llvm" "$CACHE/rust" "$CACHE/version.md"
tar -xjf "$ARCHIVE" -C "$CACHE"
ls -la "$CACHE/rust/lib" | head -5
echo EXTRACT_OK
