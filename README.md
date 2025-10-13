# Firewall Bot & Mini App Demo

This project demonstrates the firewall bot (FW-01) and accompanying Telegram Mini App dashboards (FW-02+).

## Bot Flow (FW-01)

- The bot exposes an inline keyboard with buttons for adding the bot to a group, opening the management panel, visiting the channel, checking commands, and reading information.
- The mini app button relies on `MINI_APP_URL` and the add-to-group button uses `BOT_USERNAME`/`ADD_TO_GROUP_URL`.
- Texts live in `bot/content.json`, making it easy to localise or customise without touching the source code.

### Owner Panel

- Setting `BOT_OWNER_ID` unlocks the private `/panel` command with inline navigation and dedicated back buttons.
- Owners can manage panel admins, groups, manual credit adjustments, global texts, and broadcast placeholders from the same flow.
- Promo slider controls allow listing existing slides, uploading new 960x360px banners (photo + target link), and removing outdated entries.
- The panel also includes a ban list manager to block or unblock user ids from accessing privileged dashboards.

## Mini App Dashboard (FW-02)

- Opening the mini app shows a group management dashboard with a profile header, live counts, and state-aware cards.
- Cards render active, expired, and removed states, respecting the 10-day removal grace period and exposing renew/settings CTAs.
- A Lottie empty state (`.tgs` compressed via `pako`) appears when no groups exist, mirroring the PV invite flow.
- Automatic search becomes available once the operator manages more than 10 groups; counts and labels use standard English digits.
- All texts and links remain configurable via `.env` (`VITE_INVITE_LINK`, mock delays) and placeholder callbacks for future backend wiring.

## Group Dashboard (FW-03)

- Summary cards highlight member counts, remaining subscription time, daily activity, and new members with directional trends.
- CTA buttons cover quick renewal, navigating to analytics, and opening the giveaway builder.
- The detailed section splits active modules, passive modules, and quick links so operators can jump to relevant settings immediately.

## Ban Rules (FW-05)

- The bans page organises link, media, language, and interaction rules with switches and schedules.
- Textareas expose forbidden/required keyword lists, each with counters and import/export buttons.
- Saving rules talks to the mock API and shows a toast on success, mirroring future backend behaviour.

## Additional Features

- Real Telegram Stars payment flow with in-app invoices, wallet history, and refunds. See docs/stars-payments.md for rollout steps.

- XP marketplace lets operators redeem mission XP for uptime credits, Stars, and cosmetic rewards.
- Referral boosters provide invite links so every successful signup grants XP toward free group credit.

- Stars top-up module offers plan selection, multi-winner giveaways, and support for gifting other groups.
- Analytics charts expose member growth and multi-series message activity with CSV/PNG exports and adjustable granularity.
- Management menu items cover general settings, quiet hours, required membership, custom texts, analytics, stars, and giveaways.

## Development Notes

- Run `npm run dev` for the Vite dev server and `npm run bot` to start the Telegraf bot locally.
- `docker-compose up -d postgres` starts a Postgres 16 instance with the credentials listed in `.env.example` (`DATABASE_URL`). Stop it with `docker-compose down` when you are done.
- Apply database migrations with `npm run migrate:dev` (development) and `npm run migrate:deploy` (staging/production). A Prisma Studio session is available with `npm run prisma:studio`.
- To point the bot and API to Postgres, configure `DATABASE_URL` in your `.env` file. When unset, the legacy JSON store remains the fallback.
- Stars wallet balance Ùˆ ØªØ±Ø§Ú©Ù†Ø´â€ŒÙ‡Ø§ØŒ Ú¯Ø±ÙˆÙ‡â€ŒÙ‡Ø§ØŒ ÙÙ‡Ø±Ø³Øª panel adminÙ‡Ø§ Ùˆ Ø§Ø³Ù„Ø§ÛŒØ¯Ù‡Ø§ÛŒ ØªØ¨Ù„ÛŒØºØ§ØªÛŒ Ø¯Ø± ØµÙˆØ±Øª ØªÙ†Ø¸ÛŒÙ… `DATABASE_URL` (Ùˆ `BOT_OWNER_ID`) Ø¨Ù‡â€ŒØ·ÙˆØ± Ø®ÙˆØ¯Ú©Ø§Ø± Ø§Ø² Postgres Ø®ÙˆØ§Ù†Ø¯Ù‡/Ù†ÙˆØ´ØªÙ‡ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯Ø› Ø¯Ø± ØºÛŒØ± Ø§ÛŒÙ† Ø­Ø§Ù„Øª Ù‡Ù…Ù‡ Ú†ÛŒØ² Ø±ÙˆÛŒ JSON Ù…Ø­Ù„ÛŒ Ø¨Ø§Ù‚ÛŒ Ù…ÛŒâ€ŒÙ…Ø§Ù†Ø¯. Ø¨Ø±Ø§ÛŒ Ø±Ø¯ÛŒØ§Ø¨ÛŒ Ø§ÛŒÙ† Ø¹Ù…Ù„ÛŒØ§Øª Ù…ÛŒâ€ŒØªÙˆØ§Ù†ÛŒØ¯ Ù„Ø§Ú¯â€ŒÙ‡Ø§ÛŒ `server/utils/logger.ts` Ø±Ø§ Ø¯Ø± ØªØ±Ù…ÛŒÙ†Ø§Ù„ Ø¯Ù†Ø¨Ø§Ù„ Ú©Ù†ÛŒØ¯.
- Ù¾Ø³ Ø§Ø² Ù‡Ø± ØªØºÛŒÛŒØ± Ø¯Ø± `prisma/schema.prisma` (Ù…Ø«Ù„Ø§Ù‹ Ø§ÙØ²ÙˆØ¯Ù† Ø¬Ø¯ÙˆÙ„ `PanelBan`) ÛŒÚ© migration Ø¬Ø¯ÛŒØ¯ Ø¨Ø³Ø§Ø²ÛŒØ¯ (`npm run migrate:dev -- --name <migration_name>`) Ùˆ Ø¢Ù† Ø±Ø§ Ø±ÙˆÛŒ Ù…Ø­ÛŒØ·â€ŒÙ‡Ø§ÛŒ staging/production Ù†ÛŒØ² Ø§Ø¬Ø±Ø§ Ú©Ù†ÛŒØ¯.
- ÛŒØ§Ø¯Ø¯Ø§Ø´Øªâ€ŒÙ‡Ø§ Ùˆ Ú©Ø§Ø±Ù‡Ø§ÛŒ ØªÚ©Ù…ÛŒÙ„ÛŒ Ù¾Ø§ÛŒÚ¯Ø§Ù‡ Ø¯Ø§Ø¯Ù‡ Ø¯Ø± `docs/database-notes.md` Ø¬Ù…Ø¹â€ŒØ¢ÙˆØ±ÛŒ Ø´Ø¯Ù‡â€ŒØ§Ù†Ø¯Ø› Ù¾ÛŒØ´ Ø§Ø² ØªÙˆØ³Ø¹Ù‡Ù” Ø¨Ø¹Ø¯ÛŒ Ø¢Ù† Ø±Ø§ Ù…Ø±ÙˆØ± Ú©Ù†ÛŒØ¯.
- Ø¨Ø±Ø§ÛŒ Ù…Ø¹Ù…Ø§Ø±ÛŒ Ùˆ ØªÚ©Ù…ÛŒÙ„ Ù…Ø§Ú˜ÙˆÙ„ ÙØ§ÛŒØ±ÙˆØ§Ù„ØŒ Ø·Ø±Ø­ Ø§ÙˆÙ„ÛŒÙ‡ Ø¯Ø± `docs/firewall-design.md` Ø«Ø¨Øª Ø´Ø¯Ù‡ Ø§Ø³Øª.
- Tests are not included; mocks still power most flows while the backend API is being brought online.
- `npm run build` compiles the mini app. Adjust mock delays and invite URLs through `.env` to tune the demo UI.

- ???? ???????? ????? ???? ?????? ????????? ?? endpoint ???? /api/firewall/audits/:chatId ??????? ???? ?? ?? ??? ?????? ???? RuleAudit ?? ???????????.

## Runtime Moderation Pipeline

- Group updates now flow through a configurable queue (`PROCESSING_*` env variables) capped by concurrency and interval limits.
- Text, media, membership, and service handlers emit actions (delete, warn, restrict, notify) and synchronise them with Prisma.
- Moderation decisions persist into the new `ModerationAction` table; join/leave events land in `MembershipEvent` for analytics.
- Rule configs are cached per chat (see `FIREWALL_CACHE_MS`) and reloaded on demand for rule editor updates.
- The `/healthz` endpoint performs a live Postgres check and returns `503` if the database probe fails.

## API Layer

- Mini app requests now authenticate with Telegram WebApp initData (header: `X-Telegram-Init-Data`).
- Core endpoints live under `/api/v1`: profile, groups (search, moderation history), Stars overview, firewall rule CRUD.
- Firewall API accepts the JSON DSL (conditions/actions/escalation) and triggers cache invalidation so runtime picks up changes instantly.
- Panel-only routes enforce ACL via DB-backed admin lists and fall back to local state when needed.

## Owner Panel

- The private control panel now includes a **Manage Firewall Rules** button. It lists existing rules, shows details, and lets the owner enable/disable, delete, or edit a rule.
- New rules (and edits) are supplied as JSON payloads using the same DSL as the API; a template with conditions/actions/escalation is shown when prompted.
- Saving or deleting a rule flushes the runtime cache immediately so enforcement picks up the change on the next message.

## Production Deployment

### Bot & API backend
- Copy `.env.example` to `.env` and fill in `BOT_TOKEN`, `BOT_OWNER_ID`, `DATABASE_URL`, and set `WEBHOOK_DOMAIN` to the Cloudflare Worker URL you plan to expose (for example `https://firewall-worker.yourdomain.workers.dev`).
- Run `npm run migrate:deploy` after pulling schema updates (new tables include ModerationAction and MembershipEvent).
- Review the processing env vars (`PROCESSING_*`, `MEDIA_MAX_SIZE_MB`) and adjust thresholds per environment.
- Run `docker-compose up -d postgres`, `npm run migrate:deploy`, and then start the backend with `npm run bot:webhook`. In production use a process manager (systemd, PM2, supervisor) so the process restarts automatically.
- When the server boots it registers the webhook against `WEBHOOK_DOMAIN`. Ensure the host is publicly reachable and that the Worker proxy (see below) forwards `/telegram/webhook` to this backend.
- For manual health checks call `GET `/healthz`` on the backend directly. When running behind the Worker you can hit `https://<worker-domain>`/healthz`` instead.
- Use `scripts/backup-db.(sh|ps1)` with `DATABASE_URL` set to dump Postgres snapshots before major releases.

### Cloudflare Worker (static assets + proxy)
- Build the mini app with `npm run build`. The artefacts are written to `dist/` and automatically served by the Worker via the `[site]` configuration in `wrangler.toml`.
- For local testing run `npm run worker:dev`; by default the Worker proxies to `http://127.0.0.1:3000`. Override the target with `--var BACKEND_URL=http://host:port`.
- Before deploying adjust `wrangler.toml`:
  - Set `[vars].BACKEND_URL` to the public origin of your Node.js bot/API server (the Worker appends `/api/*` and `/telegram/*` automatically).
  - Optional: add `routes = ["your.domain/*"]` if you want to bind the Worker to a custom domain.
- Deploy with `npm run worker:deploy` (or `npm run worker:publish`). After the first deployment update `VITE_API_BASE_URL` in your `.env` to use the Worker URL so the mini app calls the proxied endpoints.
- If you use environment-specific bindings configure them through `wrangler secret put` / `wrangler deploy --env <name>` so that production and staging map to the correct backend origins.

### Post-deploy checklist
- `curl https://<worker-domain>`/healthz`` should return `{ "status": "ok" }`.
- Trigger a Telegram webhook delivery (e.g., send `/start` to the bot) and verify the request reaches your backend logs through the Worker proxy.
- Open the mini app, confirm Stars overview loads via `/api/stars/overview`, and exercise owner panel flows such as Stars purchases to ensure Prisma writes are recorded.





