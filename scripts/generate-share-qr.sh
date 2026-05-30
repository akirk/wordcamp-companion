#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QR_TARGET_URL="https://my.wordpress.net/?blueprint-url=https%3A%2F%2Fraw.githubusercontent.com%2Fakirk%2Fwordcamp-companion%2Frefs%2Fheads%2Fmain%2Fblueprint-mywp.json"
QR_OUTPUT="${ROOT_DIR}/assets/share-qr.png"

if ! command -v qrencode >/dev/null 2>&1; then
    echo "qrencode is required to generate ${QR_OUTPUT}." >&2
    exit 1
fi

qrencode -o "${QR_OUTPUT}" -s 10 -m 2 "${QR_TARGET_URL}"
echo "Generated ${QR_OUTPUT}"
