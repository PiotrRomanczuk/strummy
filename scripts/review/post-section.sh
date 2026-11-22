#!/usr/bin/env bash
# File one section on the home-ops review page (/review/:id) of the open
# test → main PR, for the commit it was made from. pr-decide files the PR's own
# sections (description, files, CI); this adds what only Strummy's CI knows.
#
#   scripts/review/post-section.sh <head-sha> <key> <title> <position> <body.md> [url]
#
# Not finding an open test → main PR at <head-sha>, or home-ops on this host, is
# not an error (exit 0 with a notice): the gallery waits on uwh, and the next
# run for that PR files it. INGEST_URL / INGEST_TOKEN come from the environment
# or from the file pr-decide reads on uwh (HOME_OPS_ENV_FILE). The token is
# never printed and never on a command line (curl reads the header from a pipe).
set -uo pipefail

SHA="${1:?head sha}"
KEY="${2:?key}"
TITLE="${3:?title}"
POSITION="${4:?position}"
BODY="${5:?body file}"
LINK="${6:-}"
REPO="${GITHUB_REPOSITORY:-PiotrRomanczuk/strummy}"
ENV_FILE="${HOME_OPS_ENV_FILE:-$HOME/code/logs-stack/ops/elitedesk/seo-collect.env}"

from_env_file() {
  sed -n "s/^$1=//p" "$ENV_FILE" 2>/dev/null | tail -1 | tr -d "\"'\r"
}
INGEST_TOKEN="${INGEST_TOKEN:-$(from_env_file INGEST_TOKEN)}"
INGEST_URL="${INGEST_URL:-$(from_env_file INGEST_URL)}"
INGEST_URL="${INGEST_URL:-http://127.0.0.1:64421}"
if [ -z "$INGEST_TOKEN" ]; then
  echo "::notice::no home-ops ingest token on this host ($ENV_FILE) — section '$KEY' not filed"
  exit 0
fi

PR=$(gh pr list -R "$REPO" --base main --head test --state open --json number,headRefOid \
  --jq ".[] | select(.headRefOid == \"$SHA\") | .number" | head -1)
if [ -z "$PR" ]; then
  echo "::notice::no open test → main PR at ${SHA:0:7} — section '$KEY' not filed"
  exit 0
fi

export REPO PR SHA KEY TITLE POSITION LINK
PAYLOAD="$(mktemp)"
trap 'rm -f "$PAYLOAD"' EXIT
node - "$BODY" > "$PAYLOAD" <<'EOF' || exit 1
const fs = require('node:fs');
const [repo, number, sha, key, title, position, link] = [
  process.env.REPO.split('/').pop(), Number(process.env.PR), process.env.SHA,
  process.env.KEY, process.env.TITLE, Number(process.env.POSITION), process.env.LINK,
];
const section = { key, title, position, body_md: fs.readFileSync(process.argv[2], 'utf8') };
if (link) section.url = link;
process.stdout.write(JSON.stringify({ repo, number, head_sha: sha, source: 'strummy-ci', sections: [section] }));
EOF

STATUS=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$INGEST_URL/api/reviews/sections" \
  -H @<(printf 'X-Ingest-Token: %s\n' "$INGEST_TOKEN") -H 'Content-Type: application/json' \
  --data-binary "@$PAYLOAD")
if [ "$STATUS" = "201" ]; then
  echo "Filed '$KEY' on the review page of #$PR (${SHA:0:7})."
else
  echo "::warning::home-ops answered $STATUS to section '$KEY' for #$PR — is the review page (home-ops #87) deployed?"
fi
