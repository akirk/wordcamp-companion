#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_QR_TARGET_URL="https://my.wordpress.net/?myapps-i=wordcamp-companion"
QR_TARGET_URL="${1:-${QR_TARGET_URL:-${DEFAULT_QR_TARGET_URL}}}"
QR_OUTPUT="${ROOT_DIR}/assets/share-qr.png"

if ! command -v qrencode >/dev/null 2>&1; then
    echo "qrencode is required to generate ${QR_OUTPUT}." >&2
    exit 1
fi

qrencode -o "${QR_OUTPUT}" -s 10 -m 2 "${QR_TARGET_URL}"
echo "Generated ${QR_OUTPUT}"
