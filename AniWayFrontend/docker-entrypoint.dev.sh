#!/bin/sh
set -e
cd /app || exit 1

echo "[entrypoint] Working dir: $(pwd)"

need_install=false

if [ ! -d node_modules ]; then
  echo "[entrypoint] node_modules directory missing"
  need_install=true
elif [ "$(ls -A node_modules 2>/dev/null | head -n1)" = "" ]; then
  echo "[entrypoint] node_modules directory empty"
  need_install=true
fi

if ! [ -x node_modules/.bin/vite ]; then
  echo "[entrypoint] vite binary not present"
  need_install=true
fi

if [ "$need_install" = true ]; then
  echo "[entrypoint] Running npm install..."
  npm install
else
  echo "[entrypoint] Dependencies already present. Skipping install."
fi

echo "[entrypoint] Launching: $*"
exec "$@"
