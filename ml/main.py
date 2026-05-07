"""
ML sidecar for the koi pond water quality monitor server.

Phase 0 skeleton: endpoints exist but return `{ "available": false }` until
the underlying models are trained. The NestJS server treats a `false` here
as "fall back to rule-based recommendations" — same code path as a sidecar
outage. See ~/.claude/plans/i-haven-t-decided-yet-witty-piglet.md for the
phased rollout plan.
"""
from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="Koi pond ML sidecar",
    version="0.0.1-skeleton",
    description=(
        "Anomaly detection + DO/NH3 forecasting. Returns availability=false "
        "for all prediction endpoints in this skeleton build — NestJS server "
        "will fall back to rule-based recommendations."
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
    return Unavailable(reason="anomaly_ae model not yet trained", pondId=pondId)


@app.get("/predict/do", response_model=Unavailable | ForecastResponse)
def predict_do(pondId: str, horizonHours: int = 12):
    return Unavailable(reason="do_forecast model not yet trained", pondId=pondId)


@app.get("/predict/nh3", response_model=Unavailable | ForecastResponse)
def predict_nh3(pondId: str, horizonHours: int = 24):
    return Unavailable(reason="nh3_forecast model not yet trained", pondId=pondId)


@app.post("/retrain")
def retrain():
    """Stub — wired up in Phase 1 when models exist."""
    return {
        "status": "noop",
        "reason": "no models trained yet; bootstrap data ingestion pending",
    }


@app.get("/version")
def version() -> dict:
    return {
        "service": "koi-ml-sidecar",
        "version": app.version,
        "phase": "0-skeleton",
        "python": os.environ.get("PYTHON_VERSION", "3.11"),
    }
