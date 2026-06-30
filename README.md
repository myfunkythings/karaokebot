# Karaoke Platform

Monorepo with a NestJS API, React/Vite admin panel, PostgreSQL/Prisma data layer, and Telegram integration for karaoke queue management.

## Workspaces

- `apps/api` — backend API, Telegram webhook adapter, queue domain logic
- `apps/web` — internal admin panel for hosts and owners
- `packages/contracts` — shared types and enums
- `packages/ui` — lightweight shared UI primitives

## Quick start

1. Copy `.env.example` values into a local `.env`.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start Postgres with Docker Compose:

   ```bash
   docker compose -f infra/docker/docker-compose.yml up -d postgres
   ```

4. Run Prisma migration and seed:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

   The production stack in this repo is configured to be served from `/karaoke` on the configured
   `DOMAIN`.

   Host console access is configured through `OWNER_LOGIN`, `OWNER_PASSWORD`, and
   `OWNER_DISPLAY_NAME` in `.env`. For the current MVP, this is the single shared login for the
   whole admin panel.

   Song requests can be split by request channels without adding another admin login. The default
   seed creates `main` (`Основной бот`) and `secondary` (`Второй бот`). Their admin panels are
   intentionally separate URLs, not tabs inside one panel: `/bot/mishka` and `/bot/zapoi`. The
   second Telegram bot is optional until created; configure it later with
   `TELEGRAM_SECONDARY_BOT_TOKEN` and `TELEGRAM_SECONDARY_WEBHOOK_SECRET`.

5. Start the API and web app in separate terminals:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

6. When the production API is deployed, register Telegram against the prefixed production route:

   ```bash
   python3 scripts/register-telegram-webhook.py
   ```

   To register the optional second bot, run the same script with `TELEGRAM_CHANNEL=secondary` after
   setting `TELEGRAM_SECONDARY_BOT_TOKEN` and `TELEGRAM_SECONDARY_WEBHOOK_SECRET`.

See [docs/architecture/overview.md](/Users/nikitabuch/Yandex.Disk.localized/APPS/KARAOKE-BOT/docs/architecture/overview.md) and [docs/runbooks/deploy.md](/Users/nikitabuch/Yandex.Disk.localized/APPS/KARAOKE-BOT/docs/runbooks/deploy.md) for more detail.

## Production deploy

The default production target for this project is:

- URL: `http://calc1.printninjas.ru/karaoke/`
- SSH host alias: `calc1`
- Remote directory: `/opt/karaoke-bot`

To deploy the current repo state, run:

```bash
npm run deploy
```
