#!/usr/bin/env bash
#
# Builds the production frontend and runs the production server.
# The Express server serves the built frontend (dist/) AND the /api routes
# on a single port (default 9704), so no Vite/proxy is needed at runtime.
#
# Usage:
#   scripts/build-and-run.sh                # build + run on :9704
#   APP_PORT=8080 scripts/build-and-run.sh  # override port
#   SKIP_BOOTSTRAP=1 scripts/build-and-run.sh   # skip DB bootstrap step
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_PORT="${APP_PORT:-9704}"

echo "[deploy] (1/4) installing dependencies..."
npm install

if [[ "${SKIP_BOOTSTRAP:-0}" != "1" ]]; then
  echo "[deploy] (2/4) bootstrapping database (idempotent)..."
  npm run bootstrap
else
  echo "[deploy] (2/4) skipping database bootstrap (SKIP_BOOTSTRAP=1)"
fi

echo "[deploy] (3/4) building frontend..."
npm run build

echo "[deploy] (4/4) starting production server on http://localhost:${APP_PORT} ..."
export NODE_ENV=production
export SERVE_STATIC=true
export PORT="$APP_PORT"
exec node --import tsx server/index.ts
