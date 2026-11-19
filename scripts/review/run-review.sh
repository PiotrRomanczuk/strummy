#!/usr/bin/env bash
# The review gallery, end to end, on uwh: build `main` and this checkout
# (`test`), serve both against the database .env.local points at, capture every
# screen of tests/review/ on both, and publish the gallery.
#
#   scripts/review/run-review.sh
#
# Run from the test checkout with .env.local already written
# (scripts/test-stack/e2e-env.sh). `main` gets its own clone in
# REVIEW_MAIN_DIR and is rebuilt only when main, the env or Node changed.
# A gallery that already exists for this test/main pair is reused unless
# REVIEW_FORCE=1. Output: $REVIEW_PUBLISH_DIR/<test sha>/ (index.html,
# summary.md, the screenshots and every raw record), URL in gallery-url there.
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 2
# shellcheck source=scripts/e2e-remote/app-server.lib.sh
source scripts/e2e-remote/app-server.lib.sh

MAIN_REF="${REVIEW_MAIN_REF:-origin/main}"
MAIN_DIR="${REVIEW_MAIN_DIR:-$HOME/.cache/strummy-review/main}"
PUBLISH="${REVIEW_PUBLISH_DIR:-$HOME/strummy-review}"
BASE_URL="${REVIEW_GALLERY_BASE_URL:-http://192.168.1.75:9877}"
KEEP="${REVIEW_KEEP:-20}"
TEST_PORT="${REVIEW_TEST_PORT:-3600}"
MAIN_PORT="${REVIEW_MAIN_PORT:-3610}"
DB_CONTAINER="${E2E_DB_CONTAINER:-supabase_db_StrummyTest}"
OUT="$ROOT/review-out"

die() {
  echo "run-review: $*" >&2
  exit 1
}

case "$PUBLISH" in "" | / | "$HOME" | "$HOME/") die "refusing REVIEW_PUBLISH_DIR=$PUBLISH" ;; esac
[ -f .env.local ] || die "no .env.local — write it first (scripts/test-stack/e2e-env.sh)"

TEST_SHA=$(git rev-parse HEAD)
# FETCH_HEAD, not origin/main: the workflow's checkout is a shallow clone of one
# ref, where fetching main creates no origin/main (same as db-parity in e2e.yml).
if [ "$MAIN_REF" = "origin/main" ]; then
  git fetch --no-tags -q origin main || die "cannot fetch main"
  MAIN_SHA=$(git rev-parse FETCH_HEAD)
else
  MAIN_SHA=$(git rev-parse "$MAIN_REF") || die "cannot resolve $MAIN_REF"
fi
DEST="$PUBLISH/$TEST_SHA"
URL="$BASE_URL/$TEST_SHA/index.html"

if [ "${REVIEW_FORCE:-}" != "1" ] && grep -qs "\"main_sha\": \"$MAIN_SHA\"" "$DEST/meta.json"; then
  echo "A gallery of test $TEST_SHA against main $MAIN_SHA already exists: $URL"
  exit 0
fi

cleanup() {
  app_stop "$TEST_PORT"
  app_stop "$MAIN_PORT"
  rm -f "$MAIN_DIR/.env.local"
}
trap cleanup EXIT
rm -rf "$OUT"
mkdir -p "$OUT"

# --- main: its own clone, so the runner's checkout stays on test -------------
if [ ! -d "$MAIN_DIR/.git" ]; then
  git clone -q --no-checkout "$(git remote get-url origin)" "$MAIN_DIR" || die "clone for main"
fi
git -C "$MAIN_DIR" fetch -q --depth=1 origin "$MAIN_SHA" &&
  git -C "$MAIN_DIR" checkout -q --force --detach FETCH_HEAD &&
  git -C "$MAIN_DIR" clean -q -fdx -e node_modules -e .next -e .review ||
  die "checkout main $MAIN_SHA"
cp .env.local "$MAIN_DIR/.env.local"
KEY="$MAIN_SHA $(md5sum < .env.local | cut -d' ' -f1) $(node -v)"
(
  cd "$MAIN_DIR" || exit 1
  app_install_deps .review || exit 1
  [ "$(cat .review/built 2>/dev/null)" = "$KEY" ] && exit 0
  rm -f .review/built
  app_build && echo "$KEY" > .review/built
) || die "main: install or build failed"

# --- test: this checkout ------------------------------------------------------
app_install_deps .e2e-remote || die "test: npm ci"
npx playwright install chromium || die "playwright install chromium"
app_build || die "test: next build"

# --- serve both ---------------------------------------------------------------
app_stop "$MAIN_PORT"
app_stop "$TEST_PORT"
(cd "$MAIN_DIR" && app_start "$MAIN_PORT" "$OUT/server-main.log") || die "main server on :$MAIN_PORT (see $OUT/server-main.log)"
app_start "$TEST_PORT" "$OUT/server-test.log" || die "test server on :$TEST_PORT (see $OUT/server-test.log)"
app_clear_rate_limits "$DB_CONTAINER" > /dev/null || die "rate-limit clear in $DB_CONTAINER"

# --- capture ------------------------------------------------------------------
# Playwright's exit code is not the verdict: the review asserts nothing, and a
# broken screen is recorded in the manifest. A missing manifest is the failure.
REVIEW_OUT="$OUT" REVIEW_MAIN_URL="http://localhost:$MAIN_PORT" REVIEW_TEST_URL="http://localhost:$TEST_PORT" \
  npx playwright test --config=playwright.review.config.ts 2>&1 | tee "$OUT/run.log"
[ -s "$OUT/manifest.jsonl" ] || die "the review captured no screens (see $OUT/run.log)"

printf '{"test_sha": "%s", "main_sha": "%s", "created_at": "%s", "gallery_url": "%s"}\n' \
  "$TEST_SHA" "$MAIN_SHA" "$(date -Iseconds)" "$URL" > "$OUT/meta.json"
node scripts/review/build-gallery.mjs "$OUT" || die "build-gallery"
echo "$URL" > "$OUT/gallery-url"

# --- publish ------------------------------------------------------------------
# Everything the run produced except Playwright's own copies (baseline/ is
# main's shots again, test-results/ the diff images again).
mkdir -p "$PUBLISH"
rm -rf "$DEST.tmp"
mkdir -p "$DEST.tmp"
for f in index.html summary.md meta.json gallery-url cast.json manifest.jsonl results.json run.log shots; do
  [ -e "$OUT/$f" ] && cp -r "$OUT/$f" "$DEST.tmp/"
done
rm -rf "$DEST"
mv "$DEST.tmp" "$DEST"
# Keep the newest $KEEP galleries; only directories named like a commit go.
find "$PUBLISH" -mindepth 1 -maxdepth 1 -type d -regextype posix-extended -regex '.*/[0-9a-f]{40}' \
  -printf '%T@ %p\n' | sort -rn | tail -n +"$((KEEP + 1))" | cut -d' ' -f2- | xargs -r rm -rf
echo "Gallery: $URL"
