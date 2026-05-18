from __future__ import annotations

import logging
import os
from typing import Any

import resend
from dotenv import load_dotenv
from telegram import Bot

load_dotenv()

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
DEFAULT_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "CommitChain <notifications@commitchain.app>")


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend when configured."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY is not configured; email skipped for %s", to)
        return False

    try:
        resend.api_key = RESEND_API_KEY
        resend.Emails.send(
            {
                "from": DEFAULT_FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
        return True
    except Exception as exc:
        logger.exception("Failed to send email to %s: %s", to, exc)
        return False


async def send_telegram(chat_id: int, message: str) -> bool:
    """Send a Telegram notification when configured."""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN is not configured; Telegram message skipped")
        return False

    try:
        bot = Bot(token=TELEGRAM_BOT_TOKEN)
        await bot.send_message(chat_id=chat_id, text=message)
        return True
    except Exception as exc:
        logger.exception("Failed to send Telegram message to %s: %s", chat_id, exc)
        return False


def _extract_email(verifier: str, commitment: dict[str, Any]) -> str | None:
    emails = commitment.get("verifier_emails")
    if isinstance(emails, dict):
        value = emails.get(verifier) or emails.get(verifier.lower())
        return value if isinstance(value, str) and value else None
    return None


def _extract_telegram_chat_id(verifier: str, commitment: dict[str, Any]) -> int | None:
    chat_ids = commitment.get("verifier_telegram_chat_ids")
    if not isinstance(chat_ids, dict):
        return None

    value = chat_ids.get(verifier) or chat_ids.get(verifier.lower())
    if value is None:
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        logger.warning("Invalid Telegram chat id for verifier %s", verifier)
        return None


async def notify_verifiers(
    commitment_id: int,
    verifiers: list[str],
    commitment: dict[str, Any],
) -> dict[str, int]:
    """Notify all verifiers through any configured channels present in metadata."""
    title = str(commitment.get("title") or f"Commitment #{commitment_id}")
    deadline = commitment.get("deadline")
    subject = f"CommitChain verifier request: {title}"
    html = (
        f"<h2>You are a verifier for {title}</h2>"
        f"<p>Commitment ID: {commitment_id}</p>"
        f"<p>Deadline: {deadline}</p>"
        "<p>Please review evidence and vote before the deadline.</p>"
    )
    telegram_message = (
        f"CommitChain verifier request\n"
        f"Commitment: {title}\n"
        f"ID: {commitment_id}\n"
        f"Deadline: {deadline}"
    )

    sent_email = 0
    sent_telegram = 0

    for verifier in verifiers:
        email = _extract_email(verifier, commitment)
        if email and await send_email(email, subject, html):
            sent_email += 1

        chat_id = _extract_telegram_chat_id(verifier, commitment)
        if chat_id is not None and await send_telegram(chat_id, telegram_message):
            sent_telegram += 1

    if sent_email == 0 and sent_telegram == 0:
        logger.warning(
            "No verifier notification destinations found for commitment %s",
            commitment_id,
        )

    return {"email": sent_email, "telegram": sent_telegram}


async def send_deadline_reminder(commitment_id: int) -> None:
    """Send a reminder before a commitment deadline.

    This placeholder expects verifier contact metadata to be cached in Supabase by
    a future frontend flow. It logs today so the scheduler can call it safely.
    """
    logger.info("Deadline reminder requested for commitment %s", commitment_id)
