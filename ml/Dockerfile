FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# wget for the HEALTHCHECK below; everything else is wheels.
RUN apt-get update && apt-get install -y --no-install-recommends wget \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

# Baked into the image so the same liveness check runs whether started via
# docker run, compose, or kubernetes. Mirrors the (now-redundant) compose
# entry — both work; the image one is the canonical version.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=4 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8000/healthz || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
