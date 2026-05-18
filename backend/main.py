from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel, Field

from services.blockchain import get_commitment, get_verifiers, run_deadline_checker
from services.database import get_commitments_for_address, get_wallet_stats
from services.notify import notify_verifiers

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_KEY = os.getenv("PINATA_SECRET_KEY")

app = FastAPI(title="CommitChain API", version="0.1.0")
scheduler = BackgroundScheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CommitmentCreatedRequest(BaseModel):
    commitment_id: int = Field(..., ge=0)


@app.on_event("startup")
async def on_startup() -> None:
    """Start background jobs for the API process."""
    if not scheduler.running:
        scheduler.add_job(
            run_deadline_checker,
            "interval",
            seconds=60,
            id="deadline-checker",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("Deadline checker scheduler started")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Stop background jobs gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Deadline checker scheduler stopped")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/commitment-created")
async def commitment_created(payload: CommitmentCreatedRequest) -> dict[str, bool]:
    commitment = await asyncio.to_thread(get_commitment, payload.commitment_id)
    verifiers = await asyncio.to_thread(get_verifiers, payload.commitment_id)
    await notify_verifiers(payload.commitment_id, verifiers, commitment)
    return {"success": True}


@app.get("/api/commitments/{address}")
async def commitments_for_address(address: str) -> list[dict[str, Any]]:
    return await asyncio.to_thread(get_commitments_for_address, address)


@app.get("/api/stats/{address}")
async def wallet_stats(address: str) -> dict[str, int]:
    return await asyncio.to_thread(get_wallet_stats, address)


@app.post("/api/upload-evidence")
async def upload_evidence(file: UploadFile = File(...)) -> dict[str, str]:
    if not PINATA_API_KEY or not PINATA_SECRET_KEY:
        logger.warning("Pinata credentials are not configured; upload rejected")
        raise HTTPException(status_code=503, detail="Pinata is not configured")

    file_bytes = await file.read()
    files = {
        "file": (
            file.filename or "evidence",
            file_bytes,
            file.content_type or "application/octet-stream",
        )
    }
    headers = {
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                files=files,
                headers=headers,
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.exception("Pinata upload failed with status %s", exc.response.status_code)
        raise HTTPException(status_code=502, detail="Pinata upload failed") from exc
    except httpx.HTTPError as exc:
        logger.exception("Pinata upload request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Pinata upload request failed") from exc

    data = response.json()
    ipfs_hash = data.get("IpfsHash")
    if not isinstance(ipfs_hash, str) or not ipfs_hash:
        logger.warning("Pinata response did not include IpfsHash: %s", data)
        raise HTTPException(status_code=502, detail="Invalid Pinata response")

    return {"ipfs_hash": ipfs_hash}


handler = Mangum(app)
