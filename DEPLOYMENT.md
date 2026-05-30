# Deployment Guide

This project runs a Node.js Telegram bot with an Express web server for the bonus Mini App and cricket web game. The production entry point is `bot.js`, and the npm start command is `node bot.js`.

## 1. Prerequisites

- Node.js 18 or newer.
- npm.
- A Telegram bot token from [@BotFather](https://t.me/BotFather).
- A Supabase project for persistent bot data.
- A public HTTPS hostname. Telegram Web Apps require HTTPS in production.
- A hosting provider that can run a long-lived Node process and expose an HTTP port. Render Web Service works with the existing `RENDER_EXTERNAL_HOSTNAME` support.

## 2. Environment variables

Create a `.env` file for local development or set these variables in your hosting provider.

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `BOT_TOKEN` | Yes | `1234567890:AA...` | Telegram Bot API token from @BotFather. The bot is constructed from this value at startup, so the process will fail without it. |
| `SUPABASE_URL` | Strongly recommended | `https://your-project-ref.supabase.co` | Supabase project URL. If this or `SUPABASE_KEY` is missing, database-backed features are bypassed or fail. |
| `SUPABASE_KEY` | Strongly recommended | `eyJ...` | Supabase key used by the server. Use a server-side key only on trusted infrastructure and never expose it to browsers. |
| `PORT` | Optional | `3000` | Express listen port. Defaults to `3000`; most PaaS providers inject this automatically. |
| `RENDER_EXTERNAL_HOSTNAME` | Optional for local, recommended for production | `undercover-bot.onrender.com` | Public hostname without protocol. Used to generate Mini App/cricket URLs and to self-ping on Render. If absent, the code falls back to `undercover-bot.onrender.com` for generated URLs. |

A checked-in template is available at `.env.example`.

### Local `.env` example

```env
BOT_TOKEN=1234567890:replace-with-your-telegram-bot-token
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=replace-with-your-supabase-key
PORT=3000
RENDER_EXTERNAL_HOSTNAME=localhost:3000
```

For local Telegram Web App testing, use a tunnel such as ngrok or Cloudflare Tunnel and set `RENDER_EXTERNAL_HOSTNAME` to the public tunnel hostname without `https://`.

## 3. Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** in Supabase.
3. Run the repository SQL files in this order:
   1. `data/cricketplayers.sql` - creates and seeds the `cricketplayers` catalog.
   2. Your base application schema for `profiles`, `group_stats`, `bonus_claims`, `group_settings`, `group_rewards`, and `user_owned_players` if those tables do not already exist in your project.
   3. `db/migration.sql` - creates `hilo_games` and adds `profiles.last_daily`.
   4. `db/cricket_migration.sql` - creates `cricket_matches` and adds cricket/shop columns.
4. Confirm Row Level Security policies allow the server key to perform the required reads/writes, or use a trusted service-role key only on the backend.

The code expects these Supabase tables:

- `profiles`
- `group_stats`
- `bonus_claims`
- `group_settings`
- `group_rewards`
- `hilo_games`
- `cricketplayers`
- `user_owned_players`
- `cricket_matches`

## 4. Local deployment smoke test

```bash
npm install
cp .env.example .env
# Edit .env with real values.
npm start
```

Expected startup behavior:

- Express listens on `PORT` and logs `Dummy web server running on port ...`.
- Telegram bot commands are registered.
- The bot logs `Bot started as @<username>` after Telegram authentication succeeds.
- The root health endpoint returns `Bot is safely running!`.

Smoke-test endpoints:

```bash
curl http://localhost:3000/
curl http://localhost:3000/bonus-app
curl http://localhost:3000/cricket
```

## 5. Render deployment

1. Push the repository to GitHub/GitLab.
2. In Render, create a **Web Service** from the repository.
3. Use these service settings:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/`
4. Add environment variables:
   - `BOT_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `RENDER_EXTERNAL_HOSTNAME` (normally Render provides this; set it manually if generated Mini App URLs point to the wrong host)
   - Do not hard-code `PORT`; Render injects it.
5. Deploy the service.
6. Open `https://<your-render-host>/` and verify it returns `Bot is safely running!`.
7. In Telegram, send `/ping` or `/start` to the bot.

## 6. Telegram BotFather configuration

In [@BotFather](https://t.me/BotFather):

1. Create the bot and copy its token into `BOT_TOKEN`.
2. Configure commands if desired. The app also registers commands automatically on startup.
3. Configure the Mini App / Web App domain to your HTTPS host, for example:
   - `https://your-app.onrender.com/bonus-app`
   - `https://your-app.onrender.com/cricket`
4. Add the bot to any target groups and grant permissions required for messages, inline keyboards, and game flow.

## 7. Public routes and API endpoints

| Route | Purpose |
| --- | --- |
| `GET /` | Health check. |
| `GET /bonus-app` | Bonus/spin/shop Mini App. |
| `GET /cricket` | Cricket web game UI. |
| `GET /assets/players/:filename` | Case-insensitive cricket player image serving. |
| `GET /api/reward` | Mystery drop reward claim. |
| `GET /api/user-stats` | Mini App user stats. |
| `GET /api/spin` | Free/ad spin endpoint. |
| `GET /api/leaderboard` | Global leaderboard. |
| `GET /api/shop/players` | Shop player catalog and ownership. |
| `GET /api/shop/buy` | Buy shop player. |
| `GET /api/match` | Cricket match state. |
| `POST /api/match/select-players` | Cricket lineup selection. |
| `POST /api/match/action` | Cricket game action. |

## 8. Production notes

- Keep `.env` and `SUPABASE_KEY` out of git.
- Prefer one running bot process per token. Multiple long-polling instances with the same `BOT_TOKEN` can conflict.
- The code uses long polling (`bot.start()`), so do not configure a Telegram webhook for the same bot token unless you refactor startup.
- `RENDER_EXTERNAL_HOSTNAME` should not include `https://`; the app strips a protocol if present, but storing only the hostname avoids malformed links.
- Missing Supabase credentials cause database features to be bypassed in `db/supabase.js`, but many user-facing commands rely on persistence. Treat Supabase as required for production.
- The Adsgram browser integration currently uses a hard-coded block ID in `index.html`; there is no Adsgram environment variable in the Node deployment.
- Static assets under `public/`, `assets/`, and `data/` must be included in the deployed repository.

## 9. Updating an existing deployment

1. Pull or deploy the new code.
2. Run any new SQL migrations in Supabase before restarting the service.
3. Restart/redeploy the Node service.
4. Check logs for Telegram auth, Supabase errors, and match recovery messages.
5. Run the health endpoint and a Telegram `/ping` command.

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Process exits immediately on startup | Missing or invalid `BOT_TOKEN` | Verify the token from @BotFather and redeploy. |
| Mini App buttons open the wrong domain | Missing/wrong `RENDER_EXTERNAL_HOSTNAME` | Set it to your public host, without protocol. |
| Profiles, coins, shop, or leaderboards fail | Missing Supabase credentials or tables | Set `SUPABASE_URL`/`SUPABASE_KEY` and run SQL setup. |
| Telegram Web App does not open | Domain not configured in BotFather or not HTTPS | Configure the production HTTPS domain in BotFather. |
| Duplicate bot responses or polling errors | More than one process uses the same token | Stop duplicate deployments/workers for that token. |
