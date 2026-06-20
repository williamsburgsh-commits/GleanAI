# GleanAI Web

Web app (Next.js App Router + TypeScript + Tailwind). Deploys to Vercel.

> Status: Phantom wallet connect (step 3), on-chain quest verification via
> Alchemy (step 4), the Solana Sprint mini-game (step 5), and the admin
> dashboard for manual reward payouts (step 6) implemented.

## Design language: "Arcade Speedrun Terminal"

Dark CRT aesthetic - phosphor green on near-black, animated grid floor,
scanline overlays, monospace + `Press Start 2P` display type, arcade buttons,
a quest ticker, and a high-score readout. The whole app leans into the
"speedrun your Solana onboarding" theme rather than a generic dashboard look.

## Run locally

```bash
npm install                    # from repo root (workspaces)
npm run dev --workspace web    # http://localhost:3000
npm run build --workspace web  # production build / type-check
```

`web/.env.local` already has the Supabase URL, anon key, service-role key, and
`NEXT_PUBLIC_SOLANA_CLUSTER=devnet`.

## Phantom connect flow (deeplink + browser extension)

```
landing (/) --connect--> Phantom extension popup (desktop)
        |            or Phantom mobile app deeplink (phone)
        |                            |
        | stores tg id (?tg=)        decrypt / connect result
        |                            v
        '---------------------- /play <--- wallet linked (Supabase)
```

- **Desktop browser:** if the [Phantom extension](https://phantom.app/download) is
  installed, **Insert Wallet** opens the in-page connect popup (no redirect to
  phantom.app). Without the extension, the button shows a clear error instead of
  sending you to the website.
- **Mobile:** uses the Phantom deeplink (`phantom.app/ul/v1/connect`) and returns
  via `/connect/callback`.
- `lib/phantom.ts` - extension detect + connect, deeplink URL builder, redirect
  decrypt, wallet persistence helper.
- `app/connect/callback/page.tsx` - decrypts Phantom response, links wallet
- `app/api/wallet/route.ts` - server route (service role) that persists
  `wallet_address` to the user row; validates the address, enforces one
  wallet per account (409), creates the user if needed.

### Testing the deeplink on a phone
A phone can't reach `localhost`, so expose the dev server first:

```bash
ngrok http 3000     # then open the https URL on your phone
```

…or deploy to Vercel. Open the app via the bot's `/start` link (which appends
`?tg=<id>`), tap "Insert Wallet", approve in Phantom.

## Quest verification (Alchemy Solana RPC)

On-chain checks run server-side when the user taps "Verify" on `/play`.

- `lib/solana/connection.ts` - resolves the RPC URL (`ALCHEMY_RPC_URL`, else
  derived from `ALCHEMY_API_KEY` + `SOLANA_CLUSTER`) and caches a `Connection`.
- `lib/solana/programs.ts` - thresholds + program IDs (DEX set, Stake, Token
  Metadata). Edit here to tune what counts.
- `lib/solana/verifiers.ts` - the checks (all bounded / rate-limit friendly):
  - `wallet_funded` - `getBalance` >= 0.01 SOL
  - `token_swap` - recent tx invoking a known DEX (Jupiter/Raydium/Orca)
  - `sol_stake` - recent tx invoking the native Stake program
  - `nft_mint` - recent tx invoking Token Metadata
- `lib/solana/verify.ts` - maps `verification_type` -> verifier.
- `lib/quests.server.ts` - user/quest lookups, completion guard, points + ledger.

APIs:
- `GET /api/quests?telegramId=` - quest catalog with completion status + points.
- `POST /api/quests/verify { telegramId, questSlug }` - runs the check and, on
  success, records the completion (idempotent) and awards points.

> Note: `getProgramAccounts` on the Stake program is intentionally avoided - it
> is far too compute-heavy and gets 429'd on Alchemy's free tier. All scans are
> capped at `SIGNATURE_SCAN_LIMIT` recent signatures.

## Solana Sprint (mini-game)

A reaction-time speedrun: the player taps the matching tile for each of the 5
onboarding actions, against a live timer. Strictly skill-based (no gambling).

- `app/sprint/page.tsx` - the game (idle -> running -> done), `requestAnimationFrame`
  timer, miss counter, share button.
- `lib/sprintActions.ts` - the 5 actions; `lib/format.ts` - time formatting.
- `POST /api/sprint { telegramId, durationMs, actionsCompleted }` - saves a
  `sprint_runs` row, and on a completed run credits the `complete-sprint` quest
  (+points). Requires a Telegram id because `sprint_runs.user_id` is NOT NULL;
  anonymous visitors can still play for fun but are prompted to open from the bot
  to save. An anti-cheat floor rejects implausibly fast runs (< 800ms) from being
  marked complete.
- `app/sprint/result/[id]/page.tsx` - shareable result card page + OG metadata.
- `app/sprint/result/[id]/opengraph-image.tsx` - dynamic share image
  (`next/og`). Runs on the **edge runtime** (the nodejs runtime hits a Windows
  font-path bug in `@vercel/og`). `result_card_url` is generated on demand, so no
  Supabase Storage bucket is needed in v1.

## Telegram Mini App (`/app`)

The in-Telegram experience (like Hamster Kombat): a visual quest dashboard,
points, rank, Solana Sprint CTA, and leaderboard that opens **inside Telegram**
from a launch button.

- `app/layout.tsx` loads `telegram-web-app.js` and wraps the tree in
  `TelegramProvider`.
- `components/TelegramProvider.tsx` - initializes the Telegram shell
  (`ready/expand/theme`), and resolves the player session:
  - **Inside Telegram:** POSTs `initData` to `/api/auth` for a verified session.
  - **Plain browser:** falls back to the legacy `?tg=` param.
- `lib/telegram.ts` - **server-side `initData` HMAC verification** (the secure
  replacement for trusting `?tg=`). Requires `TELEGRAM_BOT_TOKEN` in
  `web/.env.local` (must match the bot's token).
- `app/api/auth/route.ts` - verifies `initData`, get-or-creates the user
  (storing their Telegram username), returns the player profile.
- `app/api/leaderboard/route.ts` - top players + caller's rank.
- `app/app/page.tsx` - the Mini App home (uses `useTelegram()`), with haptics on
  quest verify.

### Hybrid wallet

Phantom can't run inside Telegram's webview, so on-chain quests show a **Connect
Wallet** action that opens the connect flow in the external browser
(`webApp.openLink`). Everything else (Sprint, points, leaderboard, manual
quests) works fully inside the Mini App.

### Launching it from the bot

`web_app` buttons and the chat menu button require an **HTTPS** URL, so the Mini
App only works once `WEB_APP_URL` (bot side) points at ngrok/Vercel:

- `/start` shows a **🎮 Open GleanAI** button (`web_app` on HTTPS, a normal link
  on `localhost`).
- On launch, the bot also sets the persistent **menu button** to open `/app`.

## Admin dashboard (manual reward payouts)

V1 has **no payout smart contract** — an admin reviews who is owed SOL and pays
manually, then records the tx. The dashboard lives at `/admin`, gated by a single
shared password.

- Set `ADMIN_DASHBOARD_PASSWORD` in `web/.env.local` (already seeded with a dev
  value — **change it** before deploying). Server reads it; it is never exposed
  to the client.
- `lib/adminAuth.ts` - password check (constant-time) + httpOnly cookie (12h).
- `lib/rewards.server.ts` - list / create / status-update / summary helpers.
- APIs (all require the admin cookie, else `401`):
  - `POST /api/admin/login` / `POST /api/admin/logout`
  - `GET /api/admin/rewards?status=` - rewards (joined to user) + summary totals
  - `POST /api/admin/rewards { userId, amountSol, reason }` - create a payout
  - `PATCH /api/admin/rewards/[id] { status, payoutTxSignature? }` - mark
    `paid` (tx signature required) / `cancelled` / `pending`
  - `GET /api/admin/users?query=` - search/leaderboard to pick a recipient
- UI (`app/admin/page.tsx`): login gate, summary cards (pending count, SOL owed,
  SOL paid), a create-reward form with a recipient picker, status filters, and a
  rewards table with mark-paid (inline tx-sig entry) / cancel actions. Paid rows
  link out to the payout tx on Solscan (cluster-aware).

### Cluster must match the wallet
`SOLANA_CLUSTER` / `ALCHEMY_RPC_URL` must point at the same network the wallet
used to connect (Phantom connect uses `NEXT_PUBLIC_SOLANA_CLUSTER`). If the
wallet connects on devnet but verification queries mainnet (or vice versa),
checks will look at the wrong chain.

## Heads-up: TLS interception in this environment

A proxy/AV on this machine intercepts HTTPS, so server-side `fetch` to Supabase
fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Fix it for real by trusting the
proxy's root CA:

```bash
setx NODE_EXTRA_CA_CERTS "C:\path\to\corp-root-ca.pem"
```

(For a one-off local test only you can set `NODE_TLS_REJECT_UNAUTHORIZED=0`, but
never ship that.)
