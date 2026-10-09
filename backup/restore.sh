#!/bin/sh
# Restores a database dump and the photo mirror from /backups.
#
#   docker compose stop app
#   docker compose run --rm --entrypoint restore.sh backup [db/photoshare-....sql.gz]
#   docker compose start app
#
# Without an argument, the newest dump is used.
set -eu

dump="${1:-$(ls -1t /backups/db/photoshare-*.sql.gz 2>/dev/null | head -n1)}"
case "$dump" in /*) ;; *) dump="/backups/$dump" ;; esac
[ -f "$dump" ] || { echo "[restore] dump not found: $dump"; exit 1; }

echo "[restore] database from $dump"
gunzip -c "$dump" | psql -q -v ON_ERROR_STOP=1 -h db -U photoshare -d photoshare

echo "[restore] photos from /backups/photos"
mc alias set dst http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
mc mb --ignore-existing dst/photos >/dev/null
mc mirror --quiet --overwrite /backups/photos dst/photos

echo "[restore] done"
