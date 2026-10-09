#!/bin/sh
# Daily backup of the database and the photo bucket into /backups (a host
# folder), optionally mirrored to an off-site S3 bucket.
#
#   /backups/db/photoshare-YYYYmmdd-HHMMSS.sql.gz   kept BACKUP_KEEP_DAYS days
#   /backups/photos/                                 mirror of the bucket
#
# Run once now:  docker compose run --rm backup once
set -eu

KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
HOUR="${BACKUP_HOUR:-3}"

run_backup() {
  ts=$(date -u +%Y%m%d-%H%M%S)
  mkdir -p /backups/db /backups/photos
  echo "[backup] $ts starting"

  # Write to a temp name first so a failed dump never looks like a good one.
  pg_dump -h db -U photoshare -d photoshare --no-owner --clean --if-exists \
    | gzip -9 > "/backups/db/.tmp-$ts.sql.gz"
  mv "/backups/db/.tmp-$ts.sql.gz" "/backups/db/photoshare-$ts.sql.gz"

  mc alias set src http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
  # --remove: photos deleted in the app (e.g. LGPD account deletion) leave the
  # backup too, on the next run.
  mc mirror --quiet --overwrite --remove src/photos /backups/photos

  find /backups/db -name 'photoshare-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

  if [ -n "${BACKUP_REMOTE_URL:-}" ]; then
    mc alias set remote "$BACKUP_REMOTE_URL" "$BACKUP_REMOTE_ACCESS_KEY" "$BACKUP_REMOTE_SECRET_KEY" >/dev/null
    mc mirror --quiet --overwrite --remove /backups "remote/${BACKUP_REMOTE_BUCKET:?BACKUP_REMOTE_BUCKET not set}"
    echo "[backup] off-site copy updated"
  fi
  echo "[backup] $ts done ($(du -sh /backups | cut -f1) total)"
}

if [ "${1:-}" = "once" ]; then
  run_backup
  exit 0
fi

echo "[backup] scheduler started: daily at ${HOUR}h UTC, keeping ${KEEP_DAYS} days"
while true; do
  now=$(date -u +%s)
  next=$(date -u -d "@$(( (now / 86400) * 86400 + HOUR * 3600 ))" +%s)
  [ "$next" -le "$now" ] && next=$((next + 86400))
  sleep $((next - now))
  run_backup || echo "[backup] FAILED — check the logs above"
done
