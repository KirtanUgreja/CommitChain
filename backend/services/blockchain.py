from __future__ import annotations

import json
import logging
import os
import asyncio
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from web3 import Web3
from web3.contract import Contract

from services.database import upsert_commitment, update_wallet_stats
from services.notify import send_deadline_reminder

load_dotenv()

logger = logging.getLogger(__name__)

RPC_URL = os.getenv("RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
RESOLVER_PRIVATE_KEY = os.getenv("RESOLVER_PRIVATE_KEY")
CHAIN_ID = int(os.getenv("CHAIN_ID", "31337"))

ABI_PATH = (
    Path(__file__).resolve().parents[2]
    / "contracts"
    / "artifacts"
    / "contracts"
    / "CommitmentStake.sol"
    / "CommitmentStake.json"
)

STATUS_LABELS = {0: "ACTIVE", 1: "COMPLETED", 2: "FAILED"}
_web3: Web3 | None = None
_contract: Contract | None = None
_last_synced_block: int | None = None
_reminded_commitments: set[int] = set()


def get_web3() -> Web3 | None:
    """Return a configured Web3 connection, or None when RPC_URL is missing."""
    global _web3
    if _web3 is not None:
        return _web3

    if not RPC_URL:
        logger.warning("RPC_URL is not configured; blockchain operation skipped")
        return None

    _web3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not _web3.is_connected():
        logger.warning("Unable to connect to RPC_URL %s", RPC_URL)
    return _web3


def _load_abi() -> list[dict[str, Any]] | None:
    if not ABI_PATH.exists():
        logger.warning("CommitmentStake ABI not found at %s", ABI_PATH)
        return None

    try:
        artifact = json.loads(ABI_PATH.read_text(encoding="utf-8"))
        abi = artifact.get("abi")
        if not isinstance(abi, list):
            logger.warning("CommitmentStake artifact did not contain an ABI list")
            return None
        return abi
    except Exception as exc:
        logger.exception("Failed to load CommitmentStake ABI: %s", exc)
        return None


def get_contract() -> Contract | None:
    """Return the CommitmentStake contract instance when configured."""
    global _contract
    if _contract is not None:
        return _contract

    web3 = get_web3()
    if web3 is None:
        return None

    if not CONTRACT_ADDRESS:
        logger.warning("CONTRACT_ADDRESS is not configured; blockchain operation skipped")
        return None

    abi = _load_abi()
    if abi is None:
        return None

    try:
        checksum_address = web3.to_checksum_address(CONTRACT_ADDRESS)
        _contract = web3.eth.contract(address=checksum_address, abi=abi)
        return _contract
    except Exception as exc:
        logger.exception("Failed to initialize CommitmentStake contract: %s", exc)
        return None


def _commitment_tuple_to_dict(commitment_id: int, commitment: Any) -> dict[str, Any]:
    return {
        "id": commitment_id,
        "creator": commitment[0],
        "title": commitment[1],
        "evidence_ipfs_hash": commitment[2],
        "stake_amount": int(commitment[3]),
        "deadline": int(commitment[4]),
        "charity_address": commitment[5],
        "verifiers": list(commitment[6]),
        "pass_votes": int(commitment[7]),
        "fail_votes": int(commitment[8]),
        "status": STATUS_LABELS.get(int(commitment[9]), str(commitment[9])),
    }


def get_commitment(id: int) -> dict[str, Any]:
    """Fetch a commitment struct from the blockchain."""
    contract = get_contract()
    if contract is None:
        return {}

    try:
        commitment = contract.functions.commitments(id).call()
        return _commitment_tuple_to_dict(id, commitment)
    except Exception as exc:
        logger.exception("Failed to fetch commitment %s: %s", id, exc)
        return {}


def get_verifiers(id: int) -> list[str]:
    """Fetch verifier addresses for a commitment."""
    contract = get_contract()
    if contract is None:
        return []

    try:
        verifiers = contract.functions.getVerifiers(id).call()
        return [str(verifier) for verifier in verifiers]
    except Exception as exc:
        logger.exception("Failed to fetch verifiers for commitment %s: %s", id, exc)
        return []


def get_commitment_count() -> int:
    """Return the total number of commitments on-chain."""
    contract = get_contract()
    if contract is None:
        return 0

    try:
        return int(contract.functions.commitmentCount().call())
    except Exception as exc:
        logger.exception("Failed to fetch commitment count: %s", exc)
        return 0


def sync_commitments_to_db() -> None:
    """Poll CommitmentCreated events and cache each on-chain commitment in Supabase."""
    global _last_synced_block

    contract = get_contract()
    web3 = get_web3()
    if contract is None or web3 is None:
        return

    try:
        latest_block = int(web3.eth.block_number)
        from_block = _last_synced_block + 1 if _last_synced_block is not None else 0
        if from_block > latest_block:
            return

        try:
            event_filter = contract.events.CommitmentCreated.create_filter(
                from_block=from_block,
                to_block=latest_block,
            )
        except TypeError:
            event_filter = contract.events.CommitmentCreated.create_filter(
                fromBlock=from_block,
                toBlock=latest_block,
            )

        for event in event_filter.get_all_entries():
            commitment_id = int(event["args"]["id"])
            commitment = get_commitment(commitment_id)
            if commitment:
                upsert_commitment(commitment)

        _last_synced_block = latest_block
    except Exception as exc:
        logger.exception("Failed to sync commitments to Supabase: %s", exc)


def _send_resolve_transaction(commitment_id: int) -> str | None:
    contract = get_contract()
    web3 = get_web3()
    if contract is None or web3 is None:
        return None

    if not RESOLVER_PRIVATE_KEY:
        logger.warning("RESOLVER_PRIVATE_KEY is not configured; deadline resolution skipped")
        return None

    try:
        account = web3.eth.account.from_key(RESOLVER_PRIVATE_KEY)
        transaction = contract.functions.resolveAfterDeadline(commitment_id).build_transaction(
            {
                "from": account.address,
                "nonce": web3.eth.get_transaction_count(account.address),
                "chainId": CHAIN_ID,
                "gas": 250_000,
                "gasPrice": web3.eth.gas_price,
            }
        )
        signed = web3.eth.account.sign_transaction(transaction, RESOLVER_PRIVATE_KEY)
        raw_transaction = getattr(signed, "raw_transaction", None)
        if raw_transaction is None:
            raw_transaction = getattr(signed, "rawTransaction")
        tx_hash = web3.eth.send_raw_transaction(raw_transaction)
        return web3.to_hex(tx_hash)
    except Exception as exc:
        logger.exception("Failed to resolve commitment %s after deadline: %s", commitment_id, exc)
        return None


def run_deadline_checker() -> None:
    """Resolve ACTIVE commitments whose deadline has passed."""
    count = get_commitment_count()
    if count <= 0:
        return

    now = int(time.time())
    for commitment_id in range(count):
        commitment = get_commitment(commitment_id)
        if not commitment:
            continue

        if commitment.get("status") != "ACTIVE":
            continue

        deadline = int(commitment.get("deadline") or 0)
        seconds_until_deadline = deadline - now
        if 0 < seconds_until_deadline <= 86_400 and commitment_id not in _reminded_commitments:
            try:
                asyncio.run(send_deadline_reminder(commitment_id))
                _reminded_commitments.add(commitment_id)
            except Exception as exc:
                logger.exception(
                    "Failed to send deadline reminder for commitment %s: %s",
                    commitment_id,
                    exc,
                )

        if deadline >= now:
            upsert_commitment(commitment)
            continue

        tx_hash = _send_resolve_transaction(commitment_id)
        if tx_hash:
            logger.info("Submitted deadline resolution for %s: %s", commitment_id, tx_hash)
            refreshed = get_commitment(commitment_id)
            if refreshed:
                upsert_commitment(refreshed)
                creator = refreshed.get("creator")
                outcome = refreshed.get("status")
                if isinstance(creator, str) and isinstance(outcome, str):
                    update_wallet_stats(creator, outcome)
