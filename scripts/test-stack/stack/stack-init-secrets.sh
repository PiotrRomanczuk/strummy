#!/usr/bin/env bash
# Create StrummyTest's secrets on uwh, once. Never prints them.
#   supabase/.env      JWT secret + opaque API keys (read by stack-start.sh)
#   supabase/signing_keys.json   own ES256 key for user tokens
#   test-users.env     the shared password of every account in the anonymised copy
# All mode 600. Store each in Bitwarden with secret-put (strummy-test-keys,
# strummy-test-signing-key, strummy-test-users).
# Usage (on uwh): ~/strummy-test/stack-init-secrets.sh
set -euo pipefail
cd "${STRUMMY_TEST_DIR:-$HOME/strummy-test}"
umask 077
rand() { openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

if [ -e supabase/.env ]; then
  echo "supabase/.env exists — not overwriting (rotating keys means re-issuing them to Vercel too)"
else
  {
    echo "SUPABASE_AUTH_JWT_SECRET=$(openssl rand -hex 32)"
    echo "SUPABASE_AUTH_PUBLISHABLE_KEY=sb_publishable_$(rand 32)"
    echo "SUPABASE_AUTH_SECRET_KEY=sb_secret_$(rand 32)"
  } > supabase/.env
  echo "wrote supabase/.env"
fi

# Own ES256 signing key (config.toml signing_keys_path). Without it PostgREST also
# trusts the key the CLI ships with. The CLI reads the configured path before it
# writes it, hence the empty array first.
if [ -s supabase/signing_keys.json ] && [ "$(cat supabase/signing_keys.json)" != "[]" ]; then
  echo "supabase/signing_keys.json exists — not overwriting"
else
  printf '[]' > supabase/signing_keys.json
  yes | npx -y supabase@2.122.0 gen signing-key --algorithm ES256 >/dev/null 2>&1
  echo "wrote supabase/signing_keys.json"
fi

if [ -e test-users.env ]; then
  echo "test-users.env exists — not overwriting"
else
  echo "STRUMMY_TEST_USERS_PASSWORD=$(rand 24)" > test-users.env
  echo "wrote test-users.env"
fi
