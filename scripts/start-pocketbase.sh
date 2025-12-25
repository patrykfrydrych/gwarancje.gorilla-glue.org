#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PB_BIN="${ROOT_DIR}/pb/pocketbase"

if [[ ! -x "${PB_BIN}" ]]; then
  echo "Brak binarki PocketBase pod ${PB_BIN}"
  echo "Pobierz ją i umieść w katalogu pb/."
  exit 1
fi

exec "${PB_BIN}" serve --http=0.0.0.0:8090
