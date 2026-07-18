#!/usr/bin/env bash
# Download platform-tools via GitHub API (avoids 5-min browser CDN window),
# extract into ~/.cache/solana/<ver>/platform-tools
set -euo pipefail

VERSION="${1:-v1.41}"
# cargo-build-sbf expects ~/.cache/solana/v1.41/... (keep the leading v)
case "$VERSION" in
  v*) ;;
  *) VERSION="v$VERSION" ;;
esac
CACHE_ROOT="$HOME/.cache/solana/$VERSION"
CACHE="$CACHE_ROOT/platform-tools"
NAME="platform-tools-linux-x86_64.tar.bz2"
ARCHIVE="$CACHE/$NAME"

mkdir -p "$CACHE"
cd "$CACHE"

echo "==> resolving asset id for $VERSION"
API="https://api.github.com/repos/anza-xyz/platform-tools/releases/tags/$VERSION"
ASSET_ID=$(python3 -c "import json,urllib.request; d=json.load(urllib.request.urlopen('$API')); print(next(a['id'] for a in d['assets'] if a['name']=='$NAME'))")
SIZE=$(python3 -c "import json,urllib.request; d=json.load(urllib.request.urlopen('$API')); print(next(a['size'] for a in d['assets'] if a['name']=='$NAME'))")
echo "asset_id=$ASSET_ID size_mb=$(python3 -c "print(round($SIZE/1e6,1))")"

URL="https://api.github.com/repos/anza-xyz/platform-tools/releases/assets/$ASSET_ID"
echo "==> downloading via GitHub API (resumable)"

# wget continues; no overall max-time so slow links can finish
wget -c --tries=0 --retry-connrefused --waitretry=5 \
  --header="Accept: application/octet-stream" \
  --header="User-Agent: gleanai-local-build" \
  -O "$ARCHIVE" "$URL"

ACTUAL=$(stat -c%s "$ARCHIVE")
echo "downloaded bytes=$ACTUAL expected=$SIZE"
if [ "$ACTUAL" -ne "$SIZE" ]; then
  echo "ERROR: size mismatch" >&2
  exit 1
fi

echo "==> extracting"
find "$CACHE" -mindepth 1 -maxdepth 1 ! -name "$NAME" -exec rm -rf {} +
tar -xjf "$ARCHIVE" -C "$CACHE"

# cargo-build-sbf looks under ~/.cache/solana/v1.54 by default for 4.1.0.
# If we installed an older version, also symlink/copy to that path when requested.
if [ "${SYMLINK_AS:-}" != "" ]; then
  DEST="$HOME/.cache/solana/${SYMLINK_AS#v}/platform-tools"
  mkdir -p "$(dirname "$DEST")"
  rm -rf "$DEST"
  ln -sfn "$CACHE" "$DEST"
  echo "symlinked $DEST -> $CACHE"
fi

ls -la "$CACHE/rust/lib" | head -5
echo OK
