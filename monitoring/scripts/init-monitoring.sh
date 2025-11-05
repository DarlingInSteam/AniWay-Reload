#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.monitoring.yml"
NETWORK_NAME="aniway-network"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command is required" >&2
  exit 1
fi

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
  else
    echo "docker compose plugin or docker-compose is required" >&2
    exit 1
  fi
fi

echo "[monitoring] ensuring shared network '${NETWORK_NAME}' exists"
if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
  docker network create "${NETWORK_NAME}" >/dev/null
  echo "[monitoring] network '${NETWORK_NAME}' created"
else
  echo "[monitoring] network '${NETWORK_NAME}' already exists"
fi

echo "[monitoring] pulling images"
${COMPOSE} -f "${COMPOSE_FILE}" pull

echo "[monitoring] starting stack"
${COMPOSE} -f "${COMPOSE_FILE}" up -d

echo "[monitoring] stack is up. Grafana → http://localhost:3000"
