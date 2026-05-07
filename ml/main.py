"""
ML sidecar for the koi pond water quality monitor server.

Phase 0 status:
  * /predict/anomaly      — live (IsolationForest baseline; available iff a
                            per-pond model has been trained via /retrain/anomaly).
  * /predict/do           — stub (model not yet implemented).
  * /predict/nh3          — stub (model not yet implemented).

The NestJS server treats `available: false` from any of these the same as a
sidecar outage and falls back to rule-based recommendations. See
~/.claude/plans/i-haven-t-decided-yet-witty-piglet.md for the phased plan.
"""
from __future__ import annotations

import logging
import os
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

from db import fetch_recent_telemetry, list_ponds_with_telemetry
from models import anomaly_iforest

logger = logging.getLogger("koi-ml")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Koi pond ML sidecar",
    version="0.1.0",
    description=(
        "Anomaly detection (IsolationForest baseline) + DO/NH3 forecasting "
        "(not yet implemented). NestJS server falls back to rule-based "
        "recommendations whenever availability is false."
    ),
)


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


class Unavailable(BaseModel):
    available: Literal[False] = False
    reason: str
    pondId: str


class AnomalyResponse(BaseModel):
    available: Literal[True] = True
    pondId: str
    score: float
    flagged: bool
    flaggedMetrics: list[str]


class ForecastResponse(BaseModel):
    available: Literal[True] = True
    pondId: str
    horizonHours: int
    points: list[dict]


@app.get("/predict/anomaly", response_model=Unavailable | AnomalyResponse)
def predict_anomaly(pondId: str):
    if not anomaly_iforest.has_model(pondId):
        return Unavailable(
            reason="no anomaly model trained for this pond yet (POST /retrain/anomaly)",
            pondId=pondId,
        )
    df = fetch_recent_telemetry(pondId, hours=24)
    if df.empty:
        return Unavailable(reason="no telemetry in the last 24h", pondId=pondId)
    result = anomaly_iforest.score_latest(pondId, df)
    return AnomalyResponse(
        pondId=pondId,
        score=result.score,
        flagged=result.flagged,
        flaggedMetrics=result.flagged_metrics,
    )


@app.get("/predict/do", response_model=Unavailable | ForecastResponse)
def predict_do(pondId: str, horizonHours: int = 12):
    return Unavailable(reason="do_forecast model not yet trained", pondId=pondId)


@app.get("/predict/nh3", response_model=Unavailable | ForecastResponse)
def predict_nh3(pondId: str, horizonHours: int = 24):
    return Unavailable(reason="nh3_forecast model not yet trained", pondId=pondId)


class RetrainResponse(BaseModel):
    trained: list[dict]
    skipped: list[dict]


@app.post("/retrain/anomaly", response_model=RetrainResponse)
def retrain_anomaly():
    """Fit a fresh IsolationForest per pond on the last 7 days of telemetry.
    Idempotent — overwrites the prior model artifact.

    Phase 1 will move this to a nightly cron + write `ModelVersion` rows for
    A/B harness gating. For now it's a manual trigger so we can iterate fast.
    """
    trained: list[dict] = []
    skipped: list[dict] = []
    for pond_id in list_ponds_with_telemetry(min_hours=24):
        df = fetch_recent_telemetry(pond_id, hours=168)
        try:
            n = anomaly_iforest.fit(pond_id, df)
        except ValueError as e:
            skipped.append({"pondId": pond_id, "reason": str(e)})
            continue
        trained.append({"pondId": pond_id, "rowsFit": n})
        logger.info("trained anomaly model for pond %s on %d rows", pond_id, n)
    return RetrainResponse(trained=trained, skipped=skipped)


@app.post("/retrain")
def retrain():
    """Backwards-compat alias for /retrain/anomaly until forecasters land."""
    return retrain_anomaly()


@app.get("/version")
def version() -> dict:
    return {
        "service": "koi-ml-sidecar",
        "version": app.version,
        "phase": "0",
        "models": {
            "anomaly": "iforest_v0",
            "do_forecast": "not_implemented",
            "nh3_forecast": "not_implemented",
        },
        "python": os.environ.get("PYTHON_VERSION", "3.11"),
    }
