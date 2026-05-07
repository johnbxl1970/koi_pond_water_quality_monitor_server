# ML sidecar

Python (FastAPI + PyTorch) sidecar serving water-quality predictions to the NestJS server.

**Phase 0 status:** skeleton only. Endpoints exist; `/predict/*` returns `{ available: false }` until the underlying models are trained. The NestJS predictions service treats this the same as a sidecar outage and falls back to rule-based recommendations. See `~/.claude/plans/i-haven-t-decided-yet-witty-piglet.md` for the full plan and phasing.

## Run locally (without docker)

```bash
cd ml
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Then `curl http://localhost:8000/healthz` returns `{"status":"ok"}`.

## Run via docker compose

```bash
docker compose up -d ml
curl http://localhost:8000/healthz
```

The NestJS server reaches it at `http://ml:8000` on the docker network (configured via `ML_SIDECAR_URL`).

## Layout

- `main.py` — FastAPI app
- `models/` — model definitions (LSTM autoencoder, DO/NH3 forecasters) — empty in Phase 0
- `training/` — training scripts (bootstrap from public datasets, fine-tune per pond) — empty in Phase 0
- `datasets/` — ingestion scripts for Mendeley / Cure4Aqua / USGS — empty in Phase 0

## What lives where

| Concern | Lives in |
|---|---|
| Inference HTTP API | `main.py` |
| Model architectures | `models/` |
| Training pipelines | `training/` |
| Public-dataset ingestion | `datasets/` |
| Trained model artifacts | mounted volume `/var/lib/koi-ml/artifacts/` (gitignored) |

## Adding a model (Phase 1+)

1. Define the architecture in `ml/models/<name>.py`
2. Add a training script in `ml/training/train_<name>.py` that pulls features from TimescaleDB
3. Wire the inference path into the matching `/predict/*` route in `main.py`
4. Record the artifact in the `ModelVersion` table from the training script — flip `isActive=true` only after the A/B harness clears it
