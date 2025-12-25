#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PB_DATA="${ROOT_DIR}/pb/pb_data"
BACKUP_DIR="${ROOT_DIR}/pb/backups"

if [[ ! -d "${PB_DATA}" ]]; then
  echo "Brak katalogu danych: ${PB_DATA}"
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${BACKUP_DIR}/pb_data-${STAMP}.tgz"

tar -czf "${ARCHIVE}" -C "${PB_DATA}" .

echo "Backup zapisany: ${ARCHIVE}"
