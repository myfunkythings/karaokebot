#!/usr/bin/env python3
import json
import os
import sys
import urllib.request


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required env var: {name}")
    return value


def to_env_slug(channel: str) -> str:
    return "".join(char if char.isalnum() else "_" for char in channel.upper())


def get_channel_env(channel: str, suffix: str, fallback_name=None) -> str:
    if channel == "main" and fallback_name:
        return require_env(fallback_name)

    return require_env(f"TELEGRAM_{to_env_slug(channel)}_{suffix}")


def build_webhook_url(domain: str, channel: str) -> str:
    normalized = domain.rstrip("/")
    if not normalized.startswith("http://") and not normalized.startswith("https://"):
        normalized = f"https://{normalized}"
    if channel == "main":
        return f"{normalized}/karaoke/api/telegram/webhook"
    return f"{normalized}/karaoke/api/telegram/{channel}/webhook"


def main() -> int:
    channel = os.getenv("TELEGRAM_CHANNEL", "main").strip() or "main"
    token = get_channel_env(channel, "BOT_TOKEN", "TELEGRAM_BOT_TOKEN")
    secret = get_channel_env(channel, "WEBHOOK_SECRET", "TELEGRAM_WEBHOOK_SECRET")
    webhook_url_env = (
        "TELEGRAM_WEBHOOK_URL"
        if channel == "main"
        else f"TELEGRAM_{to_env_slug(channel)}_WEBHOOK_URL"
    )
    webhook_url = os.getenv(webhook_url_env, "").strip()
    if webhook_url:
        webhook_url = webhook_url.rstrip("/")
    else:
        domain = require_env("DOMAIN")
        webhook_url = build_webhook_url(domain, channel)

    payload = {
        "url": webhook_url,
        "secret_token": secret,
        "allowed_updates": ["message"]
    }

    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/setWebhook",
        data=json.dumps(payload).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=20) as response:
        body = json.load(response)

    print(json.dumps(body, ensure_ascii=False, indent=2))
    if not body.get("ok"):
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
