# Architecture Overview

## Shape

- Monorepo on npm workspaces
- `apps/api` as the single system of record and integration point
- `apps/web` as the host/admin SPA
- PostgreSQL as the primary transactional store
- Telegram webhook handled inside the API, not as a separate service

## Core domain rules

- Exactly one active karaoke session at a time
- Queue priority is derived from:
  1. singer has not sung yet
  2. lower sung count
  3. earlier request time
- Host can override order via `manual_pin`
- Undo is backed by `action_log` with request state snapshots
- Session settings are snapshotted into `sessions.config_snapshot_json`

## Request lifecycle

1. Telegram webhook or manual host form creates `song_requests`
2. API refreshes `session_guest_stats`
3. API rebuilds the effective queue ranks
4. Host actions mutate request state transactionally
5. Archive and stats read from finalized requests and derived stats

## Operational notes

- API uses Postgres advisory locks for session-sensitive mutations
- Telegram updates are deduplicated via `telegram_updates.telegram_update_id`
- The queue is materialized through `queue_rank` for a fast host UI
