# Firewall Bot & Mini App Demo

This project demonstrates the firewall bot (FW-01) and accompanying Telegram Mini App dashboards (FW-02+).

## Bot Flow (FW-01)

- The bot exposes an inline keyboard with buttons for adding the bot to a group, opening the management panel, visiting the channel, checking commands, and reading information.
- The mini app button relies on `MINI_APP_URL` and the add-to-group button uses `BOT_USERNAME`/`ADD_TO_GROUP_URL`.
- Texts live in `bot/content.json`, making it easy to localise or customise without touching the source code.

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

- Stars top-up module offers plan selection, multi-winner giveaways, and support for gifting other groups.
- Analytics charts expose member growth and multi-series message activity with CSV/PNG exports and adjustable granularity.
- Management menu items cover general settings, quiet hours, required membership, custom texts, analytics, stars, and giveaways.

## Development Notes

- Run `npm run dev` for the Vite dev server and `npm run bot` to start the Telegraf bot locally.
- Tests are not included; mocks power the current flows.
- `npm run build` compiles the mini app (linting currently expects type fixes in `GroupAnalyticsPage.tsx`).
- Adjust mock delays and invite URLs through `.env` to tune the demo.
