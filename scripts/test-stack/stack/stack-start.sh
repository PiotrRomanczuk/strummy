#!/usr/bin/env bash
# Start (or restart) StrummyTest on uwh — the `test` branch's database.
# Same pattern as social-hub's ops/uwh/supabase-start.sh: own secrets from
# supabase/.env, only the services the app uses. postgres-meta and Studio stay
# off (Kong serves /pg/* without an API key — incident 2026-11-15), and so do
# analytics/vector, storage, edge functions, imgproxy and the pooler.
# Usage (on uwh): ~/strummy-test/stack-start.sh
set -euo pipefail
cd "${STRUMMY_TEST_DIR:-$HOME/strummy-test}"
CLI="supabase@2.122.0"

# Production's image versions (docker inspect supabase_*_StudentProduction,
# 2026-11-15), so `test` verifies what `main` will run. Bump with production.
mkdir -p supabase/.temp
printf '17.6.1.132' > supabase/.temp/postgres-version
printf 'v2.189.0' > supabase/.temp/gotrue-version
printf 'v14.12' > supabase/.temp/rest-version
printf 'v2.103.2' > supabase/.temp/realtime-version

for key in SUPABASE_AUTH_JWT_SECRET SUPABASE_AUTH_PUBLISHABLE_KEY SUPABASE_AUTH_SECRET_KEY; do
  grep -q "^$key=" supabase/.env || { echo "missing $key in supabase/.env — run stack-init-secrets.sh"; exit 1; }
done
set -a; . supabase/.env; set +a
# `supabase start` ends with a table of the live keys; never let it reach a log or a terminal
# transcript (2026-11-15: it did once, and the keys had to be rotated).
redact() { sed -E 's/(sb_(publishable|secret)_)[A-Za-z0-9_-]+/\1<redacted>/g; s/eyJ[A-Za-z0-9._-]{20,}/<redacted-jwt>/g'; }
npx -y "$CLI" start -x studio,postgres-meta,edge-runtime,logflare,vector,imgproxy,supavisor,storage-api 2>&1 | redact
npx -y "$CLI" status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=' | sed 's/=.*/=<set>/'
