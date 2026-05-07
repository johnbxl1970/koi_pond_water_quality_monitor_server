"""Per-pond IsolationForest anomaly detector.

This is the v0 baseline: lightweight, no GPU, fits on a single CPU core in
seconds for any realistic pond's data. It catches sensor drift and "this
reading doesn't look like the rest of this pond's history" outliers.

Graduates to LSTM Autoencoder per the plan-of-record once ponds accumulate
≥7 days of telemetry and we have a federated-or-centralized base model.
Until then this baseline is what ships.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from db import FEATURE_COLUMNS

ARTIFACT_ROOT = "/var/lib/koi-ml/artifacts/anomaly"
MIN_TRAIN_ROWS = 48  # at 15-min intervals this is ~12h; bare minimum to fit


@dataclass
class AnomalyResult:
    score: float
    flagged: bool
    flagged_metrics: list[str]


def _artifact_path(pond_id: str) -> str:
    return os.path.join(ARTIFACT_ROOT, f"{pond_id}.joblib")


def _build_pipeline() -> Pipeline:
    """IsolationForest doesn't tolerate NaNs — we impute with the median, then
    standardize so the contamination heuristic isn't dominated by raw scale
    differences (pH ~7 vs DO ~8 vs ORP ~250)."""
    return Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
            (
                "iforest",
                IsolationForest(
                    n_estimators=100,
                    contamination="auto",
                    random_state=42,
                ),
            ),
        ]
    )


def fit(pond_id: str, df: pd.DataFrame) -> int:
    """Train on the supplied telemetry frame; return the row count fit on.

    Raises ValueError if there isn't enough data to learn a sensible normal."""
    if len(df) < MIN_TRAIN_ROWS:
        raise ValueError(
            f"Need ≥{MIN_TRAIN_ROWS} rows to fit anomaly model; got {len(df)}"
        )
    X = df[list(FEATURE_COLUMNS)].to_numpy(dtype=float)
    # Track which features had ≥30% non-NaN coverage during training. Sparse
    # features get scored alongside the rest (the imputer fills medians) but
    # we won't surface them in `flagged_metrics` — flipping a probe that's
    # mostly-missing is a noisy signal we don't want to put in front of users.
    coverage = np.isfinite(X).mean(axis=0)
    learned_mask = coverage >= 0.3
    pipe = _build_pipeline()
    pipe.fit(X)
    os.makedirs(ARTIFACT_ROOT, exist_ok=True)
    joblib.dump({"pipeline": pipe, "learned_mask": learned_mask}, _artifact_path(pond_id))
    return len(df)


def has_model(pond_id: str) -> bool:
    return os.path.exists(_artifact_path(pond_id))


def score_latest(pond_id: str, df: pd.DataFrame) -> AnomalyResult:
    """Score the most recent row in ``df`` against the saved model.

    Returns:
        AnomalyResult.score: lower = more anomalous (sklearn convention).
        AnomalyResult.flagged: predict() == -1 (outlier per the model).
        AnomalyResult.flagged_metrics: features whose z-score >2 vs the
            training distribution — heuristic for "what looks weird here".
    """
    bundle = joblib.load(_artifact_path(pond_id))
    pipe: Pipeline = bundle["pipeline"]
    learned_mask: np.ndarray = bundle["learned_mask"]
    latest_row = df[list(FEATURE_COLUMNS)].iloc[[-1]].to_numpy(dtype=float)
    score = float(pipe.score_samples(latest_row)[0])
    flagged = bool(pipe.predict(latest_row)[0] == -1)

    # Per-feature deviation. Reach into the fitted imputer + scaler to get the
    # training-time medians and stds; flag any feature whose latest reading
    # is >2σ from training-time normal AND whose training data had real
    # coverage (else we'd flag mostly-missing probes for spurious reasons).
    imputer: SimpleImputer = pipe.named_steps["impute"]
    scaler: StandardScaler = pipe.named_steps["scale"]
    imputed_row = imputer.transform(latest_row)
    z = (imputed_row[0] - scaler.mean_) / np.where(scaler.scale_ == 0, 1, scaler.scale_)
    flagged_metrics = [
        FEATURE_COLUMNS[i]
        for i, zi in enumerate(z)
        if learned_mask[i] and np.isfinite(zi) and abs(zi) > 2
    ]
    return AnomalyResult(score=score, flagged=flagged, flagged_metrics=flagged_metrics)
