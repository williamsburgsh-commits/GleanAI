# GleanAI Merkle distributor (Anchor)

SPL-only claim program for weekly Merkle epochs. Until `$GLEAN` launches, deploy against a **devnet test mint** and set `CLAIM_MINT` / `CLAIM_PROGRAM_ID` in web env.

## Prerequisites

- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor 0.30.x](https://www.anchor-lang.com/docs/installation)
- Devnet SOL for deploy + vault funding

## Build & deploy (devnet)

Program id (current keypair): `GmTBUan8sodfqKot1e266kAeVEcWyhGKDPNRfXCuW9ax`

Local WSL build (when GitHub downloads of platform-tools are slow):

```bash
# one-time: fetch + extract Solana platform-tools (~500MB)
python3 scripts/parallel-dl.py v1.54 8
bash scripts/extract-tools.sh v1.54

# build .so into target/deploy/
bash scripts/build-distributor.sh v1.54

# fund wallet then deploy (needs ~2 SOL on devnet)
# https://faucet.solana.com  →  wallet from `solana address`
bash scripts/fund-and-deploy.sh
```

Or classic Anchor flow from repo root:

```bash
anchor build
anchor keys list   # replace declare_id! + Anchor.toml with the generated program id
anchor build       # rebuild after id swap
anchor deploy --provider.cluster devnet
```

## Initialize + fund (devnet)

One-shot (Windows Node 20+; keypair via `KEYPAIR` or WSL `~/.config/solana/id.json`):

```powershell
$env:KEYPAIR = "\\wsl$\Ubuntu-24.04\home\$env:USERNAME\.config\solana\id.json"
$env:NODE_PATH = "$PWD\web\node_modules"
node scripts/init-distributor.mjs
```

This creates a 6-decimal test mint, calls `initialize`, mints 1_000_000 tokens into the vault PDA, and writes `.claim-env.local`.

**Current devnet setup**

| | |
|---|---|
| Program | `GmTBUan8sodfqKot1e266kAeVEcWyhGKDPNRfXCuW9ax` |
| Test mint | `869JgAMpXs9vH6j3sjFzA3VgqpjhJesyRqy23UvQhENu` |
| Authority | `DYseMjMfc34d1KQuWGpT3r1vu93w7q3VG9YSHUJhnvHo` |
| Distributor PDA | `CrSoKKU7JZzo8zktNUwWar6uXDArZB1HZbfkKkheKqmv` |
| Vault | `5iftiFBfnah8Uruj6WyTU4mckEqcLMxkohsJQU78i4Hd` |

## Publish epoch → set_root → claim

One-shot (reads `web/.env.local`, uses public devnet RPC for confirm):

```powershell
$env:KEYPAIR = "\\wsl$\Ubuntu-24.04\home\choum\.config\solana\id.json"
$env:NODE_PATH = "$PWD\web\node_modules"
$env:SET_ROOT = "1"
node scripts/publish-claim-epoch.mjs          # previous completed week
# or: node scripts/publish-claim-epoch.mjs 2026-W28
```

Or stepwise:

1. Restart `web` so `CLAIM_*` from `web/.env.local` load.
2. Admin → **Publish previous week**, or `node scripts/publish-claim-epoch.mjs`.
3. Authority: `node scripts/set-root.mjs <merkle_root_hex>` (use public RPC, not Alchemy).
4. Admin **set-root tx** (or script marks `funded` when `SET_ROOT=1`).
5. Claimant opens Mini App **Claim** → `/claim` and signs with the **leaf wallet** (needs a little SOL for ATA rent).

**Devnet E2E (2026-W28):** root `325d5b8c…f41c` set on-chain; epoch status `funded`; leaf wallet `B2NCbEqP…DwJq` for 275 tokens.

## Web env

See root `.env.example` / paste from `.claim-env.local`:

- `CLAIM_MINT` / `NEXT_PUBLIC_CLAIM_MINT`
- `CLAIM_PROGRAM_ID` / `NEXT_PUBLIC_CLAIM_PROGRAM_ID`
- `CLAIM_POINTS_TO_UNITS=1000000`
- `CLAIM_AUTHORITY` (pubkey that signs `set_root`; CLI signing is fine for v1)

Without program IDs set, publish + eligibility UI still work; on-chain claim stays disabled.
