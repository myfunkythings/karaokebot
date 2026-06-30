#!/usr/bin/env bash

set -euo pipefail

REMOTE_HOST="${DEPLOY_HOST:-calc1}"
REMOTE_DIR="${DEPLOY_DIR:-/opt/karaoke-bot}"
PUBLIC_URL="${DEPLOY_URL:-http://calc1.printninjas.ru/karaoke/}"
ALLOWED_HOSTS="${VITE_ALLOWED_HOSTS:-calc1.printninjas.ru,zapoi.john-doe.ru}"

echo "==> Деплой на ${REMOTE_HOST}:${REMOTE_DIR}"

rsync -az --delete \
  --rsync-path='sudo rsync' \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'apps/web/node_modules' \
  --exclude 'apps/api/node_modules' \
  --exclude '.env' \
  ./ "${REMOTE_HOST}:${REMOTE_DIR}/"

ssh "${REMOTE_HOST}" "
  set -euo pipefail
  cd '${REMOTE_DIR}'

  echo '==> Сборка образа API'
  sudo docker build -t karaoke-api:latest -f infra/docker/api.Dockerfile .

  echo '==> Сборка образа WEB'
  sudo docker build -t karaoke-web:latest \
    --build-arg VITE_APP_BASE=/karaoke/ \
    --build-arg VITE_API_BASE=/karaoke/api \
    -f infra/docker/web.Dockerfile .

  echo '==> Перезапуск API'
  sudo docker rm -f karaoke-api >/dev/null 2>&1 || true
  sudo docker run -d \
    --name karaoke-api \
    --restart unless-stopped \
    --network karaoke-net \
    --env-file '${REMOTE_DIR}/.env' \
    -p 127.0.0.1:3011:3000 \
    karaoke-api:latest >/dev/null

  echo '==> Перезапуск WEB'
  sudo docker rm -f karaoke-web >/dev/null 2>&1 || true
  sudo docker run -d \
    --name karaoke-web \
    --restart unless-stopped \
    --network karaoke-net \
    -e VITE_ALLOWED_HOSTS='${ALLOWED_HOSTS}' \
    -e VITE_APP_BASE=/karaoke/ \
    -e VITE_API_BASE=/karaoke/api \
    -p 127.0.0.1:4174:4173 \
    karaoke-web:latest >/dev/null

  echo '==> Контейнеры'
  sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep karaoke
"

echo "==> Проверка ${PUBLIC_URL}"
for attempt in {1..20}; do
  if curl -I -sS "${PUBLIC_URL}" >/tmp/karaoke-deploy-check.txt 2>/dev/null; then
    cat /tmp/karaoke-deploy-check.txt
    exit 0
  fi

  echo "Ожидание запуска приложения... попытка ${attempt}/20"
  sleep 2
done

echo "Приложение не ответило по ${PUBLIC_URL} после ожидания" >&2
exit 1
