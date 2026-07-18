#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Prefer Node 20+ if available (web3.js + uuid ESM issue on Node 18)
if command -v node20 >/dev/null 2>&1; then
  NODE=node20
elif [ -x "$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin/node" ]; then
  NODE="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" | tail -1)/bin/node"
else
  NODE=node
fi

echo "using $($NODE -v)"
export NODE_PATH="$ROOT/web/node_modules${NODE_PATH:+:$NODE_PATH}"
# Also try root node_modules
export NODE_PATH="$ROOT/node_modules:$NODE_PATH"

# Force resolution from web first by cd into web for module resolution quirks
cd "$ROOT/web"
exec "$NODE" --input-type=module <<'EOF'
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve('..');
const script = path.join(root, 'scripts', 'init-distributor.mjs');
const r = spawnSync(process.execPath, [script], {
  stdio: 'inherit',
  cwd: root,
  env: {
    ...process.env,
    NODE_PATH: path.join(root, 'web', 'node_modules'),
  },
});
process.exit(r.status ?? 1);
EOF
