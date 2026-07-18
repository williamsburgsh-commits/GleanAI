#!/usr/bin/env bash
set -euo pipefail

CACHE="$HOME/.cache/solana/v1.54/platform-tools"
URL="https://github.com/anza-xyz/platform-tools/releases/download/v1.54/platform-tools-linux-x86_64.tar.bz2"
ARCHIVE="$CACHE/platform-tools-linux-x86_64.tar.bz2"

mkdir -p "$CACHE"
cd "$CACHE"

echo "==> downloading platform-tools v1.54 (resumable)"
# Long timeouts; resume if partial; retry a few times
for i in 1 2 3 4 5; do
  echo "attempt $i..."
  if curl -L --fail --retry 5 --retry-delay 5 \
      --connect-timeout 60 --max-time 0 \
      -C - -o "$ARCHIVE" "$URL"; then
    break
  fi
  echo "curl failed; sleeping then retry"
  sleep 5
done

ls -lh "$ARCHIVE"
echo "==> extracting"
# Remove any prior extract leftovers except the archive
find "$CACHE" -mindepth 1 -maxdepth 1 ! -name 'platform-tools-linux-x86_64.tar.bz2' -exec rm -rf {} +
tar -xjf "$ARCHIVE" -C "$CACHE"

echo "==> verifying rust/lib"
ls -la "$CACHE/rust/lib" | head -5
echo "OK: platform-tools ready at $CACHE"
