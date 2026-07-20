#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOMAIN="motahari-ticketing-system.vercel.app"

echo "Deploying to Vercel production…"
OUTPUT="$(npx vercel --prod --yes 2>&1 | tee /dev/stderr)"

DEPLOY_URL="$(printf '%s\n' "$OUTPUT" | sed -nE 's#.*(https://motahari-ticketing-system-[a-z0-9]+-behbahanisahars-projects\.vercel\.app).*#\1#p' | head -1)"

if [[ -z "${DEPLOY_URL}" ]]; then
  DEPLOY_URL="$(printf '%s\n' "$OUTPUT" | sed -nE 's#.*(https://motahari-ticketing-system-[a-z0-9.-]+\.vercel\.app).*#\1#p' | head -1)"
fi

if [[ -z "${DEPLOY_URL}" ]]; then
  echo "Could not find deployment URL in Vercel output." >&2
  exit 1
fi

echo "Aliasing ${DEPLOY_URL} → https://${DOMAIN}"
npx vercel alias set "$DEPLOY_URL" "$DOMAIN"

echo
echo "Live app: https://${DOMAIN}"
