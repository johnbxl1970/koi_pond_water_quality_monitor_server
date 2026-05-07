"""Sidecar-owned writes for ModelVersion + PredictionEvent.

The sidecar writes directly to Postgres (rather than calling back to NestJS)
because every prediction is paired with a write — round-tripping through HTTP
would double the latency of /predict/* calls and add a coupled failure mode.
The schema's `id` columns are TEXT NOT NULL with no DB DEFAULT (Prisma's
@default(cuid()) runs in the client, not the database), so we mint cuids in
Python here.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from cuid import cuid

from db import connection


def record_model_version(
    *,
    kind: str,
    pond_id: str | None,
    version: str,
    artifact_path: str,
    metadata: dict[str, Any],
    activate: bool = True,
) -> str:
    """Insert a ModelVersion row. If `activate=True`, deactivate any prior
    active row with the same (kind, pondId) scope so the per-pond invariant
    holds. Returns the new row's id.
    """
    new_id = cuid()
    with connection() as conn, conn.cursor() as cur:
        if activate:
            # Deactivate prior active versions in the same scope. Per-pond
            # scopes are isolated from the global scope (pondId IS NULL).
            if pond_id is None:
                cur.execute(
                    'UPDATE "ModelVersion" SET "isActive" = false '
                    'WHERE "kind" = %(kind)s::"PredictionKind" '
                    'AND "pondId" IS NULL AND "isActive" = true',
                    {"kind": kind},
                )
            else:
                cur.execute(
                    'UPDATE "ModelVersion" SET "isActive" = false '
                    'WHERE "kind" = %(kind)s::"PredictionKind" '
                    'AND "pondId" = %(pond_id)s AND "isActive" = true',
                    {"kind": kind, "pond_id": pond_id},
                )
        cur.execute(
            'INSERT INTO "ModelVersion" '
            '("id", "kind", "pondId", "version", "artifactPath", "metadata", "isActive") '
            'VALUES (%(id)s, %(kind)s::"PredictionKind", %(pond_id)s, %(version)s, '
            '%(artifact_path)s, %(metadata)s::jsonb, %(is_active)s)',
            {
                "id": new_id,
                "kind": kind,
                "pond_id": pond_id,
                "version": version,
                "artifact_path": artifact_path,
                "metadata": json.dumps(metadata),
                "is_active": activate,
            },
        )
        conn.commit()
    return new_id


def get_active_model_version_id(kind: str, pond_id: str | None) -> str | None:
    """Look up the currently-active ModelVersion id for a (kind, pondId)
    scope. Used at inference time to stamp each PredictionEvent with the
    model that produced it."""
    with connection() as conn, conn.cursor() as cur:
        if pond_id is None:
            cur.execute(
                'SELECT "id" FROM "ModelVersion" '
                'WHERE "kind" = %(kind)s::"PredictionKind" '
                'AND "pondId" IS NULL AND "isActive" = true LIMIT 1',
                {"kind": kind},
            )
        else:
            cur.execute(
                'SELECT "id" FROM "ModelVersion" '
                'WHERE "kind" = %(kind)s::"PredictionKind" '
                'AND "pondId" = %(pond_id)s AND "isActive" = true LIMIT 1',
                {"kind": kind, "pond_id": pond_id},
            )
        row = cur.fetchone()
    return row["id"] if row else None


def record_prediction_event(
    *,
    pond_id: str,
    kind: str,
    model_version_id: str,
    predicted: dict[str, Any],
    target_time: datetime | None = None,
) -> str:
    """Insert a PredictionEvent for back-testing + A/B comparison. For
    current-state predictions (anomaly), `target_time` defaults to now."""
    new_id = cuid()
    target = target_time or datetime.now(timezone.utc)
    with connection() as conn, conn.cursor() as cur:
        cur.execute(
            'INSERT INTO "PredictionEvent" '
            '("id", "pondId", "kind", "modelVersionId", "targetTime", "predicted") '
            'VALUES (%(id)s, %(pond_id)s, %(kind)s::"PredictionKind", '
            '%(model_version_id)s, %(target_time)s, %(predicted)s::jsonb)',
            {
                "id": new_id,
                "pond_id": pond_id,
                "kind": kind,
                "model_version_id": model_version_id,
                "target_time": target,
                "predicted": json.dumps(predicted),
            },
        )
        conn.commit()
    return new_id
