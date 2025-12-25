#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${APP_DIR:-${ROOT_DIR}/apps/web}"
BUILD_DIR="${BUILD_DIR:-${APP_DIR}/dist}"

PB_RUNTIME_DIR="${PB_RUNTIME_DIR:-/mnt/sql/api/pocketbase}"
PB_PUBLIC_DIR="${PB_PUBLIC_DIR:-${PB_RUNTIME_DIR}/pb_public}"
PB_HOOKS_DIR="${PB_HOOKS_DIR:-${PB_RUNTIME_DIR}/pb_hooks}"
PB_MIGRATIONS_DIR="${PB_MIGRATIONS_DIR:-${PB_RUNTIME_DIR}/pb_migrations}"

RUN_INSTALL="${RUN_INSTALL:-1}"
RUN_BUILD="${RUN_BUILD:-1}"
RESTART_SERVICE="${RESTART_SERVICE:-1}"
PB_SERVICE="${PB_SERVICE:-pocketbase}"
PB_SERVICE_SCOPE="${PB_SERVICE_SCOPE:-system}"

sync_dir() {
  local src="$1"
  local dest="$2"

  mkdir -p "${dest}"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "${src}/" "${dest}/"
  else
    cp -a "${src}/." "${dest}/"
  fi
}

if [[ "${RUN_BUILD}" == "1" ]]; then
  if [[ "${RUN_INSTALL}" == "1" ]]; then
    (cd "${APP_DIR}" && npm ci)
  fi
  (cd "${APP_DIR}" && npm run build)
fi

if [[ ! -d "${BUILD_DIR}" ]]; then
  echo "Brak outputu builda: ${BUILD_DIR}" >&2
  exit 1
fi

sync_dir "${BUILD_DIR}" "${PB_PUBLIC_DIR}"

if [[ -d "${ROOT_DIR}/pb_hooks" ]]; then
  sync_dir "${ROOT_DIR}/pb_hooks" "${PB_HOOKS_DIR}"
fi

if [[ -d "${ROOT_DIR}/pb_migrations" ]]; then
  sync_dir "${ROOT_DIR}/pb_migrations" "${PB_MIGRATIONS_DIR}"
fi

if [[ "${RESTART_SERVICE}" == "1" ]]; then
  if command -v systemctl >/dev/null 2>&1; then
    if [[ "${PB_SERVICE_SCOPE}" == "user" ]]; then
      systemctl --user restart "${PB_SERVICE}"
    else
      sudo systemctl restart "${PB_SERVICE}"
    fi
  else
    echo "systemctl niedostepny - pominieto restart uslugi." >&2
  fi
fi
