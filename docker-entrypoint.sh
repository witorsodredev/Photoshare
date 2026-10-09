#!/bin/sh
set -e

echo "[entrypoint] waiting for database..."
tries=0
until npx prisma db push --skip-generate --accept-data-loss >/dev/null 2>&1; do
  tries=$((tries + 1))
  if [ "$tries" -ge 30 ]; then
    echo "[entrypoint] database not reachable, giving up"
    npx prisma db push --skip-generate --accept-data-loss
    exit 1
  fi
  echo "[entrypoint] retry $tries ..."
  sleep 2
done

node prisma/bootstrap-admin.mjs

echo "[entrypoint] schema synced, starting Next.js"
exec npm run start
