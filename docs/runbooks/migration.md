# Migration Runbook

## Goal

Switch from Telegram + Google Sheets to the new platform with minimal downtime and a fast rollback path.

## Steps

1. Freeze the current Google Sheet structure and export a CSV snapshot.
2. Validate all current bot replies and host actions against the new admin UI.
3. Dry-run the new system in staging with a separate Telegram bot token.
4. Seed the new platform owner account and verify login.
5. Open the first real session in the new platform before the event starts.
6. Switch the production bot webhook to the new API endpoint.
7. Keep Google Sheets read-only as a fallback during the first 1-2 live evenings.

## Rollback trigger

- webhook intake stops
- queue actions fail
- database becomes unavailable

## Rollback action

1. Export the current queue from the new DB if possible.
2. Point the Telegram webhook back to the legacy bot.
3. Continue the evening in Google Sheets.
4. Inspect `telegram_updates` and `action_log` after the event to recover missing intent.
