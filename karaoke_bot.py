# -*- coding: utf-8 -*-
"""
Telegram-бот для Replit с двумя режимами:

1. Основной режим: отправляет заявки в новую karaoke-программу через API.
2. Резервный режим: если API недоступен, продолжает работать через Google Sheets.

Дополнительно можно включить зеркальную запись в таблицу даже при успешной отправке в API:
  GOOGLE_SHEETS_MIRROR_WRITES=true

Ожидаемые переменные окружения:
  TELEGRAM_BOT_TOKEN                 - токен Telegram-бота
  KARAOKE_API_BASE_URL              - базовый URL новой программы, например https://example.com
  KARAOKE_API_TELEGRAM_SECRET       - секрет для /api/telegram/*
  GOOGLE_SHEETS_SPREADSHEET_NAME    - имя таблицы, по умолчанию "Караоке Заявки"
  GOOGLE_SHEETS_MIRROR_WRITES       - true/false, по умолчанию false
"""

import json
import logging
import os
import re
import time
from collections import Counter
from threading import Thread
from urllib import error, request

from flask import Flask

from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)


POS_BTN = "Моя позиция"
ANTI_SPAM_SECONDS = 5 * 60
TZ_OFFSET_SEC = 3 * 3600
HTTP_TIMEOUT_SEC = 10
SETTINGS_CACHE_TTL_SEC = 30

DEFAULT_BOT_REPLY_TEMPLATES = {
    "startMessage": (
        "Привет! Отправь сообщение в формате исполнитель + песня, и заявка попадёт ведущему."
    ),
    "unknownCommand": (
        "Не понял команду. Просто отправь сообщение с исполнителем и песней, например: "
        "Кино - Пачка сигарет."
    ),
    "emptyMessage": "Пришлите, пожалуйста, исполнителя и название песни.",
    "requestAccepted": (
        "Заявка принята. Если ведущий не успеет распознать песню, он уточнит её в админ-панели."
    ),
    "requestRejectedRateLimit": "Слишком часто. Подожди немного и отправь заявку ещё раз.",
    "requestRejectedNoSession": (
        "Сейчас приём заявок закрыт. Попробуй чуть позже, когда ведущий откроет смену."
    ),
    "statusCurrentPerformer": "Ты сейчас поёшь или уже на подходе к сцене.",
    "statusNoGuestProfile": "У тебя пока нет активных заявок.",
    "statusNoActiveRequests": "У тебя сейчас нет заявок в активной смене.",
    "statusQueuedSummary": (
        "Ты в очереди. Следи за сценой и подходи, когда тебя позовут.\n\n"
        "Текущая заявка: {{title}}\n"
        "Позиция в очереди: {{position}}."
    ),
    "fallbackPositionUnavailable": (
        "Не удалось получить позицию: сейчас недоступны и новая программа, и Google Sheets."
    ),
    "fallbackRequestSaveFailed": (
        "Не удалось сохранить заявку: недоступны и новая программа, и Google Sheets."
    ),
    "fallbackStatusNoRequests": "Сейчас заявок нет.",
    "fallbackStatusNoActiveRequests": "Сейчас ваших активных заявок нет.",
    "fallbackStatusQueuedSummary": (
        "🎶 Ваша заявка принята!\n\n"
        "👉 В очереди приоритет у тех, кто ещё не пел, потом у тех, кто спел меньше песен, "
        "и только потом учитывается время заявки. Так что система старается, чтобы все успели спеть.\n\n"
        "⏳ {{queue_tail}}"
    ),
    "fallbackStatusQueuedNoAhead": "Прямо сейчас активных заявок перед вами нет.",
    "fallbackStatusQueuedAheadTemplate": "Перед вами сейчас примерно {{before}} заявок.",
}


logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("karaoke-bot")


last_messages: dict[int, float] = {}
_sheet_instance = None
_settings_cache: dict[str, str] | None = None
_settings_cache_until = 0.0


def keep_alive():
    app = Flask(__name__)

    @app.get("/")
    def home():
        return "Бот работает"

    Thread(target=lambda: app.run(host="0.0.0.0", port=8080)).start()


def env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "да"}


def now_hhmm_msk() -> str:
    t = time.localtime(time.time() + TZ_OFFSET_SEC)
    return time.strftime("%H:%M", t)


def is_true_cell(v: str) -> bool:
    return str(v).strip().upper() in ("TRUE", "1", "ДА", "YES")


def api_base_url() -> str:
    return os.getenv("KARAOKE_API_BASE_URL", "").rstrip("/")


def api_secret() -> str:
    return os.getenv("KARAOKE_API_TELEGRAM_SECRET", "").strip()


def api_enabled() -> bool:
    return bool(api_base_url() and api_secret())


def mirror_writes_to_sheet() -> bool:
    return env_flag("GOOGLE_SHEETS_MIRROR_WRITES", default=False)


def get_sheet():
    global _sheet_instance
    if _sheet_instance is not None:
        return _sheet_instance

    try:
        import gspread
        from oauth2client.service_account import ServiceAccountCredentials
    except Exception as exc:
        raise RuntimeError(
            "Google Sheets библиотеки не установлены: нужны gspread и oauth2client."
        ) from exc

    creds_path = os.getenv("GOOGLE_SHEETS_CREDS_FILE", "creds.json")
    spreadsheet_name = os.getenv("GOOGLE_SHEETS_SPREADSHEET_NAME", "Караоке Заявки")
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive",
    ]

    creds = ServiceAccountCredentials.from_json_keyfile_name(creds_path, scope)
    gc = gspread.authorize(creds)
    _sheet_instance = gc.open(spreadsheet_name).sheet1
    return _sheet_instance


def sheets_enabled() -> bool:
    try:
        get_sheet()
        return True
    except Exception as exc:
        log.warning("Google Sheets недоступен: %s", exc)
        return False


def read_active_rows():
    sheet = get_sheet()
    rows = sheet.get_all_values()
    if not rows:
        return [], []

    data = rows[1:]
    data = [r for r in data if len(r) >= 5 and r[4].strip()]
    queue = [r for r in data if not is_true_cell(r[3])]
    return data, queue


def sung_counter(data):
    cnt = Counter()
    for r in data:
        user = r[1]
        try:
            cnt[user] += int(r[2] or 0)
        except Exception:
            pass
    return cnt


def sort_key_fair(r, counter: Counter):
    user = r[1]
    songs_sung = counter.get(user, 0)
    hhmm = r[0]
    return (songs_sung, hhmm)


def approximate_before(queue_sorted, username: str) -> int | None:
    first_idx = next((i for i, r in enumerate(queue_sorted) if r[1] == username), None)
    if first_idx is None:
        return None

    seen_users = set()
    count = 0
    for i in range(first_idx):
        u = queue_sorted[i][1]
        if u not in seen_users:
            seen_users.add(u)
            count += 1
    return count


def friendly_queue_text(before: int | None) -> str:
    templates = bot_reply_templates()
    if before is None:
        queue_tail = templates["fallbackStatusQueuedNoAhead"]
    else:
        queue_tail = render_template(
            templates["fallbackStatusQueuedAheadTemplate"], before=before
        )
    return render_template(templates["fallbackStatusQueuedSummary"], queue_tail=queue_tail)


def build_update_payload(update: Update) -> dict:
    message = update.effective_message
    sender = update.effective_user
    chat = update.effective_chat
    return {
        "update_id": update.update_id,
        "message": {
            "message_id": message.message_id if message else None,
            "text": message.text if message else None,
            "chat": {"id": chat.id if chat else None},
            "from": {
                "id": sender.id if sender else None,
                "username": sender.username if sender else None,
                "first_name": sender.first_name if sender else None,
                "last_name": sender.last_name if sender else None,
            },
        },
    }


def post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url,
        data=data,
        headers={
            "content-type": "application/json",
            "x-telegram-bot-api-secret-token": api_secret(),
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=HTTP_TIMEOUT_SEC) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {body}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"URL error: {exc.reason}") from exc


def fetch_json(url: str) -> dict:
    req = request.Request(
        url,
        headers={
            "content-type": "application/json",
            "x-telegram-bot-api-secret-token": api_secret(),
        },
        method="GET",
    )

    try:
        with request.urlopen(req, timeout=HTTP_TIMEOUT_SEC) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {body}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"URL error: {exc.reason}") from exc


def bot_reply_templates() -> dict[str, str]:
    global _settings_cache, _settings_cache_until

    now = time.time()
    if _settings_cache is not None and now < _settings_cache_until:
        return _settings_cache

    templates = DEFAULT_BOT_REPLY_TEMPLATES.copy()
    if api_enabled():
        try:
            response = fetch_json(f"{api_base_url()}/api/telegram/settings")
            remote_templates = response.get("botReplyTemplates") or {}
            if isinstance(remote_templates, dict):
                for key, value in remote_templates.items():
                    if key in templates and isinstance(value, str):
                        templates[key] = value
        except Exception as exc:
            log.warning("Не удалось получить шаблоны сообщений из API: %s", exc)

    _settings_cache = templates
    _settings_cache_until = now + SETTINGS_CACHE_TTL_SEC
    return templates


def render_template(template: str, **values: str | int) -> str:
    result = template
    for key, value in values.items():
        result = result.replace(f"{{{{{key}}}}}", str(value))
    return result


def submit_request_to_api(update: Update) -> str:
    url = f"{api_base_url()}/api/telegram/webhook"
    payload = build_update_payload(update)
    response = post_json(url, payload)
    if response.get("ok") is not True:
        raise RuntimeError(f"Unexpected API response: {response}")

    # Ответ пользователю отправляет сама новая программа через sendMessage.
    return "api"


def fetch_position_from_api(telegram_user_id: int) -> str:
    url = f"{api_base_url()}/api/telegram/status"
    response = post_json(url, {"telegramUserId": str(telegram_user_id)})
    message = (response.get("message") or "").strip()
    if not message:
        raise RuntimeError(f"Unexpected API response: {response}")
    return message


def username_for_sheet(update: Update) -> str:
    user = update.effective_user
    return user.username or user.first_name or "guest"


def store_request_in_sheet(update: Update):
    sheet = get_sheet()
    username = username_for_sheet(update)
    text = (update.effective_message.text or "").replace("\n", " ").strip()

    def first_empty_row():
        col_a = sheet.col_values(1)
        return len(col_a) + 1

    row = first_empty_row()
    sheet.batch_update(
        [
            {"range": f"A{row}:B{row}", "values": [[now_hhmm_msk(), username]]},
            {"range": f"E{row}", "values": [[text]]},
        ],
        value_input_option="USER_ENTERED",
    )


def position_text_from_sheet(update: Update) -> str:
    templates = bot_reply_templates()
    username = username_for_sheet(update)
    data, queue = read_active_rows()
    if not data:
        return templates["fallbackStatusNoRequests"]

    counter = sung_counter(data)
    queue_sorted = sorted(queue, key=lambda r: sort_key_fair(r, counter))
    before = approximate_before(queue_sorted, username)
    if before is None:
        return templates["fallbackStatusNoActiveRequests"]
    return friendly_queue_text(before)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        bot_reply_templates()["startMessage"],
    )


async def my_position(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if api_enabled():
        try:
            message = fetch_position_from_api(update.effective_user.id)
            await update.message.reply_text(message)
            return
        except Exception as exc:
            log.warning("Не удалось получить позицию из API, переключаюсь на таблицу: %s", exc)

    if not sheets_enabled():
        await update.message.reply_text(
            bot_reply_templates()["fallbackPositionUnavailable"]
        )
        return

    await update.message.reply_text(position_text_from_sheet(update))


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (update.message.text or "").replace("\n", " ").strip()
    if not text:
        await update.message.reply_text(bot_reply_templates()["emptyMessage"])
        return

    api_error = None
    if api_enabled():
        try:
            submit_request_to_api(update)
            if mirror_writes_to_sheet() and sheets_enabled():
                store_request_in_sheet(update)
            return
        except Exception as exc:
            api_error = exc
            log.warning("Не удалось отправить заявку в API, переключаюсь на таблицу: %s", exc)

    if not sheets_enabled():
        details = f" Ошибка API: {api_error}" if api_error else ""
        await update.message.reply_text(
            bot_reply_templates()["fallbackRequestSaveFailed"]
            + details
        )
        return

    user_id = update.effective_user.id
    now = time.time()
    if user_id in last_messages and (now - last_messages[user_id]) < ANTI_SPAM_SECONDS:
        await update.message.reply_text(
            bot_reply_templates()["requestRejectedRateLimit"]
        )
        return

    store_request_in_sheet(update)
    last_messages[user_id] = now
    await update.message.reply_text(position_text_from_sheet(update))


def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("Отсутствует TELEGRAM_BOT_TOKEN в окружении")

    if not api_enabled():
        log.warning(
            "Новая программа не настроена: нет KARAOKE_API_BASE_URL или KARAOKE_API_TELEGRAM_SECRET. "
            "Бот будет работать только через Google Sheets."
        )

    app = ApplicationBuilder().token(token).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("pos", my_position))
    app.add_handler(MessageHandler(filters.Regex(rf"^{re.escape(POS_BTN)}$"), my_position))
    app.add_handler(
        MessageHandler(
            filters.TEXT & ~filters.COMMAND & ~filters.Regex(rf"^{re.escape(POS_BTN)}$"),
            handle_message,
        )
    )

    keep_alive()
    app.run_polling()


if __name__ == "__main__":
    main()
