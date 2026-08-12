# Deploy Runbook

## Default deploy target for this project

- SSH host alias: `calc1`
- Production server URL: `http://calc1.printninjas.ru/karaoke/`
- Remote project directory: `/opt/karaoke-bot`
- Default deploy command from the repo root:

  ```bash
  npm run deploy
  ```

- The command above uses `scripts/deploy.sh` and does the full flow automatically:
  sync project files to `/opt/karaoke-bot`, rebuild `karaoke-api` and `karaoke-web`,
  restart both containers on the existing `karaoke-net` network, then verify `/karaoke/`.

## One-command deploy procedure

When you just need to publish the current state of the repo, use:

```bash
npm run deploy
```

This is the project-default deploy path and should be preferred over ad hoc manual steps.

## 1. Prepare the VPS

- Install Docker Engine and Docker Compose plugin
- Point a domain or subdomain to the VPS IP
- Open inbound ports `80` and `443`

## 2. Configure environment

1. Copy `.env.example` to `.env`
2. Set production values for:
   - `DOMAIN`
   - `DATABASE_URL`
   - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` if you are using the bundled Postgres service
   - `SESSION_SECRET`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `TELEGRAM_PETYA_BOT_TOKEN` and `TELEGRAM_PETYA_WEBHOOK_SECRET` when the Petya bot is enabled
   - owner credentials

## 3. Start the stack

```bash
docker compose -f infra/docker/docker-compose.yml up -d --build
```

## 4. Bootstrap the database

- The API container now runs `prisma migrate deploy` automatically on startup.
- On the very first deploy, seed the owner account once:

  ```bash
  docker compose -f infra/docker/docker-compose.yml exec api npm run prisma:seed --workspace @karaoke/api
  ```

- If you need to apply migrations manually, use the production-safe command:

  ```bash
  docker compose -f infra/docker/docker-compose.yml exec api npm run prisma:migrate:deploy --workspace @karaoke/api
  ```

## 5. Register the Telegram webhook

The API now attempts to restore the Telegram webhook automatically on startup when
`TELEGRAM_WEBHOOK_URL` or `DOMAIN` is configured in production.

If you need to force a manual re-registration, use the Telegram Bot API:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_DOMAIN/karaoke/api/telegram/webhook",
    "secret_token": "YOUR_TELEGRAM_WEBHOOK_SECRET"
  }'
```

The production stack in this repository is served under the `/karaoke` path prefix, so the
Telegram webhook must point to `/karaoke/api/telegram/webhook`, not `/api/telegram/webhook`.
Petya uses `/karaoke/api/telegram/petya/webhook`; its admin SPA is mounted separately at
`/karaoke-petya/` and must be routed to the same web container by the production reverse proxy.

## 6. Backup routine

- Nightly `pg_dump` of the `karaoke` database
- Store backups outside the VPS when possible
- Keep the latest 7 daily dumps at minimum

## 7. Rollback

- Repoint Telegram webhook to the previous bot endpoint if needed
- Export current queue data from Postgres before rollback
- Restore the last successful DB backup only if the data model itself is corrupted
