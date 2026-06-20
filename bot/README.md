# GleanAI Bot

Telegram bot service (Node.js + Telegraf). Deploys to Railway.

> Status: commands implemented (step 2) + Telegram Mini App launch button (step 7).

## Mini App launch

The bot launches the web app as a **Telegram Mini App** (`WEB_APP_URL/app`):
- `/start` shows a **🎮 Open GleanAI** button.
- On startup the bot sets the persistent chat **menu button** to open the app.

Both require `WEB_APP_URL` to be **HTTPS** (ngrok/Vercel). On `localhost` the bot
falls back to a normal link and skips the menu button.

## Setup

`bot/.env` already has the Supabase URL + anon key. Before running live you must add:

- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Dashboard → Project Settings → API
  (the bot uses this to bypass RLS for user/points writes).
- `TELEGRAM_BOT_TOKEN` — from [@BotFather](https://t.me/BotFather).

## Run locally

```bash
npm install                      # from the repo root (workspaces)
npm run dev --workspace bot      # starts the bot with --watch
```

## Verify without going live

```bash
npm run smoke --workspace bot    # builds the bot + checks all commands, no network
```

## Commands

- `/start` — registers the user, issues a referral code, applies an inbound
  referral (via `?start=<code>` deep link), and shows a **🎮 Open GleanAI**
  button that launches the Telegram Mini App (`web_app` button on HTTPS, a plain
  link on `localhost`)
- `/quests` — lists active quests with completion status
- `/points` — shows the user's points
- `/leaderboard` — top players by points
- `/referral` — shares the user's referral code + invite link

## Layout

```
src/
├── index.js              # entry: launch + graceful shutdown + setMyCommands
├── bot.js                # buildBot() wires commands (no launch -> testable)
├── config.js             # env loading + validation
├── supabase.js           # service-role Supabase client
├── commands/             # one file per command
├── services/             # users + quests data access
└── lib/                  # errors (safeHandler/unwrap), referral codes
```

