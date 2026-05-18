from __future__ import annotations

import logging
import os
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

_supabase: Client | None = None


def get_supabase() -> Client | None:
    """Return a configured Supabase client, or None when credentials are absent."""
    global _supabase
    if _supabase is not None:
        return _supabase

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("Supabase is not configured; database operation skipped")
        return None

    _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase


def _normalize_address(address: str) -> str:
    return address.lower()


def upsert_commitment(data: dict[str, Any]) -> dict[str, Any] | None:
    """Insert or update a commitment cache row."""
    client = get_supabase()
    if client is None:
        return None

    payload = dict(data)
    if "creator" in payload and isinstance(payload["creator"], str):
        payload["creator"] = _normalize_address(payload["creator"])
    if "verifiers" in payload and isinstance(payload["verifiers"], list):
        payload["verifiers"] = [
            _normalize_address(verifier)
            for verifier in payload["verifiers"]
            if isinstance(verifier, str)
        ]

    try:
        response = client.table("commitments").upsert(payload, on_conflict="id").execute()
        return response.data[0] if response.data else None
    except Exception as exc:
        logger.exception("Failed to upsert commitment: %s", exc)
        return None


def get_commitments_for_address(address: str) -> list[dict[str, Any]]:
    """Return commitments where address is the creator or one of the verifiers."""
    client = get_supabase()
    if client is None:
        return []

    normalized = _normalize_address(address)
    merged: dict[Any, dict[str, Any]] = {}

    try:
        creator_response = (
            client.table("commitments").select("*").eq("creator", normalized).execute()
        )
        for row in creator_response.data or []:
            merged[row.get("id", len(merged))] = row
    except Exception as exc:
        logger.exception("Failed to fetch creator commitments: %s", exc)

    try:
        verifier_response = (
            client.table("commitments")
            .select("*")
            .contains("verifiers", [normalized])
            .execute()
        )
        for row in verifier_response.data or []:
            merged[row.get("id", len(merged))] = row
    except Exception as exc:
        logger.exception("Failed to fetch verifier commitments: %s", exc)

    return list(merged.values())


def get_wallet_stats(address: str) -> dict[str, int]:
    """Return cached aggregate stats for a wallet."""
    client = get_supabase()
    if client is None:
        return {"total": 0, "completed": 0, "failed": 0, "streak": 0}

    normalized = _normalize_address(address)
    try:
        response = (
            client.table("wallet_stats")
            .select("total,completed,failed,streak")
            .eq("address", normalized)
            .limit(1)
            .execute()
        )
        if not response.data:
            return {"total": 0, "completed": 0, "failed": 0, "streak": 0}

        row = response.data[0]
        return {
            "total": int(row.get("total") or 0),
            "completed": int(row.get("completed") or 0),
            "failed": int(row.get("failed") or 0),
            "streak": int(row.get("streak") or 0),
        }
    except Exception as exc:
        logger.exception("Failed to fetch wallet stats: %s", exc)
        return {"total": 0, "completed": 0, "failed": 0, "streak": 0}


def update_wallet_stats(address: str, outcome: str) -> dict[str, int] | None:
    """Update wallet stats after a commitment outcome."""
    client = get_supabase()
    if client is None:
        return None

    normalized = _normalize_address(address)
    current = get_wallet_stats(normalized)
    outcome_key = outcome.lower()

    total = current["total"] + 1
    completed = current["completed"]
    failed = current["failed"]
    streak = current["streak"]

    if outcome_key == "completed":
        completed += 1
        streak += 1
    elif outcome_key == "failed":
        failed += 1
        streak = 0
    else:
        logger.warning("Unknown wallet stats outcome %s; no update applied", outcome)
        return current

    payload = {
        "address": normalized,
        "total": total,
        "completed": completed,
        "failed": failed,
        "streak": streak,
    }

    try:
        response = client.table("wallet_stats").upsert(payload, on_conflict="address").execute()
        return response.data[0] if response.data else payload
    except Exception as exc:
        logger.exception("Failed to update wallet stats: %s", exc)
        return None
