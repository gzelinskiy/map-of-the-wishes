#!/bin/sh
# Щоденний бекап побажань і ключів. Cron: 15 4 * * * /path/to/deploy/backup.sh
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$OUT"
tar -czf "$OUT/nebo-$(date +%F).tar.gz" -C "$ROOT" data
# зберігаємо 30 останніх
ls -1t "$OUT"/nebo-*.tar.gz | tail -n +31 | xargs -r rm --
