# pg_dump (matches the db major version) + MinIO client, in one small image.
FROM docker.io/pgsty/mc:RELEASE.2026-09-16T00-00-00Z AS mc

FROM docker.io/library/postgres:16-alpine
COPY --from=mc /usr/bin/mc /usr/local/bin/mc
COPY backup.sh restore.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
