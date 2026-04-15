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


def build_webhook_url(domain: str) -> str:
    normalized = domain.rstrip("/")
    if not normalized.startswith("http://") and not normalized.startswith("https://"):
        normalized = f"https://{normalized}"
    return f"{normalized}/karaoke/api/telegram/webhook"


def main() -> int:
    token = require_env("TELEGRAM_BOT_TOKEN")
    secret = require_env("TELEGRAM_WEBHOOK_SECRET")
    webhook_url = os.getenv("TELEGRAM_WEBHOOK_URL", "").strip()
    if webhook_url:
        webhook_url = webhook_url.rstrip("/")
    else:
        domain = require_env("DOMAIN")
        webhook_url = build_webhook_url(domain)

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
