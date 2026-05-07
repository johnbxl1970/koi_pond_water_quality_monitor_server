"""TimescaleDB reader for the ML sidecar.

The sidecar reads telemetry directly rather than receiving it over HTTP — keeps
the inference protocol clean (the NestJS server just asks "predict for pond X"
without staging features) and lets training pipelines pull large windows
without round-tripping through the API.
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Iterator

import pandas as pd
import psycopg
from psycopg.rows import dict_row


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL not set in the ML sidecar environment. "
            "See docker-compose.yml's ml service env block."
        )
    return url


@contextmanager
def connection() -> Iterator[psycopg.Connection]:
    with psycopg.connect(_database_url(), row_factory=dict_row) as conn:
        yield conn


# Sensor columns used as features. Source-discriminator + non-numeric fields
# are excluded — the model only consumes numeric water-quality readings.
FEATURE_COLUMNS = (
    "phVal",
    "tempC",
    "doMgL",
    "orpMv",
    "tdsPpm",
    "turbidityNtu",
    "nh3TotalPpm",
    "nh3FreePpm",
    "no2Ppm",
    "no3Ppm",
    "khDkh",
    "ghDgh",
)


def fetch_recent_telemetry(pond_id: str, hours: int = 168) -> pd.DataFrame:
    """Pull the last ``hours`` of telemetry for a pond, ordered ascending.

    Returns an empty DataFrame if nothing is in range — callers should
    branch on ``df.empty`` and surface ``available: false`` in that case.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    cols = ", ".join(f'"{c}"' for c in FEATURE_COLUMNS)
    sql = f"""
        SELECT "time", {cols}
        FROM "Telemetry"
        WHERE "pondId" = %(pond_id)s
          AND "time" >= %(since)s
        ORDER BY "time" ASC
    """
    with connection() as conn, conn.cursor() as cur:
        cur.execute(sql, {"pond_id": pond_id, "since": since})
        rows = cur.fetchall()
    return pd.DataFrame(rows)


def list_ponds_with_telemetry(min_hours: int = 24) -> list[str]:
    """Pond IDs that have telemetry in the last ``min_hours`` — the candidate
    set for retraining."""
    since = datetime.now(timezone.utc) - timedelta(hours=min_hours)
    with connection() as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT DISTINCT "pondId" FROM "Telemetry" WHERE "time" >= %(since)s',
            {"since": since},
        )
        return [r["pondId"] for r in cur.fetchall()]
