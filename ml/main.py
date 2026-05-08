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
import time
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

from db import FEATURE_COLUMNS, fetch_recent_telemetry, list_ponds_with_telemetry
from db_writes import (
    get_active_model_version_id,
    record_model_version,
    record_prediction_event,
)
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
    model_version_id = get_active_model_version_id("ANOMALY_SCORE", pondId)
    if model_version_id is None:
        # Artifact on disk but no active ModelVersion row — the artifact was
        # left over from before writes were wired up, or someone deactivated
        # it manually. Refuse to serve rather than return an unattributable
        # prediction.
        return Unavailable(
            reason="model artifact present but no active ModelVersion row; retrain to refresh",
            pondId=pondId,
        )
    df = fetch_recent_telemetry(pondId, hours=24)
    if df.empty:
        return Unavailable(reason="no telemetry in the last 24h", pondId=pondId)
    result = anomaly_iforest.score_latest(pondId, df)
    predicted = {
        "score": result.score,
        "flagged": result.flagged,
        "flaggedMetrics": result.flagged_metrics,
    }
    try:
        record_prediction_event(
            pond_id=pondId,
            kind="ANOMALY_SCORE",
            model_version_id=model_version_id,
            predicted=predicted,
        )
    except Exception as e:  # noqa: BLE001 — never let logging crash inference
        logger.warning("failed to record PredictionEvent for %s: %s", pondId, e)
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
    Each successful fit:
      1. Overwrites the on-disk joblib artifact for that pond.
      2. Inserts a new `ModelVersion` row scoped to (kind, pondId), and
         deactivates the prior active row in the same scope.

    Phase 1 will move this to a nightly cron + add an A/B gating step that
    only flips `isActive` after the candidate beats the incumbent on
    held-out data. For now every successful fit auto-activates.
    """
    trained: list[dict] = []
    skipped: list[dict] = []
    for pond_id in list_ponds_with_telemetry(min_hours=24):
        df = fetch_recent_telemetry(pond_id, hours=168)
        try:
            fit_result = anomaly_iforest.fit(pond_id, df)
        except ValueError as e:
            skipped.append({"pondId": pond_id, "reason": str(e)})
            continue
        try:
            ts_ms = int(time.time() * 1000)
            window_start = df["time"].min().isoformat() if not df.empty else None
            window_end = df["time"].max().isoformat() if not df.empty else None
            mv_id = record_model_version(
                kind="ANOMALY_SCORE",
                pond_id=pond_id,
                version=f"anomaly_iforest-v0-{pond_id}-{ts_ms}",
                artifact_path=fit_result.artifact_path,
                metadata={
                    "algorithm": "IsolationForest",
                    "rowsFit": fit_result.rows_fit,
                    "windowStart": window_start,
                    "windowEnd": window_end,
                    "hyperparams": {"n_estimators": 100, "contamination": "auto"},
                    "fitDurationMs": fit_result.fit_duration_ms,
                    "artifactSizeBytes": fit_result.artifact_size_bytes,
                    "paramCount": fit_result.param_count,
                    "featureColumns": list(FEATURE_COLUMNS),
                },
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("fit succeeded but ModelVersion write failed for %s: %s", pond_id, e)
            skipped.append({"pondId": pond_id, "reason": f"db write failed: {e}"})
            continue
        trained.append({
            "pondId": pond_id,
            "rowsFit": fit_result.rows_fit,
            "modelVersionId": mv_id,
        })
        logger.info(
            "trained anomaly model for pond %s on %d rows (mv=%s)",
            pond_id, fit_result.rows_fit, mv_id,
        )
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
