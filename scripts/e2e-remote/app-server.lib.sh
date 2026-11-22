# shellcheck shell=bash
# Install, build and serve a checkout of the app with `next start`, on uwh.
# Shared by remote-runner.sh (one build, the E2E suite) and
# scripts/review/run-review.sh (main and test side by side). Every function
# works on the current directory; the caller sets -uo pipefail.

# app_install_deps <cache-dir> — npm ci, unless node_modules already matches.
#
# Node version is part of the cache key: platform-specific native deps (the
# Next.js SWC/Turbopack binary) are resolved at npm-ci time for whatever Node
# was active, and a lockfile-only hash silently reuses a stale install after
# a Node upgrade — node_modules kept answering to the runner's old system Node
# until the version went into the key, even though the workflow said otherwise.
# node_modules/.package-lock.json is npm ci's own completion sentinel: deleted
# first, written last — so a cancelled install can never masquerade as current.
app_install_deps() {
  local hash_file="$1/package-lock.md5" hash
  mkdir -p "$1"
  hash=$(cat package-lock.json <(node -v) | md5sum | cut -d' ' -f1)
  if [ ! -f node_modules/.package-lock.json ] ||
    [ "$(cat "$hash_file" 2>/dev/null)" != "$hash" ]; then
    rm -f "$hash_file"
    npm ci --no-audit --no-fund || return 1
    echo "$hash" > "$hash_file"
  fi
}

# app_build — next build, up to three attempts.
#
# Turbopack's next/font/google resolution has a known upstream flake
# (vercel/next.js#61886, "sporadically" — reproduced here regardless of Node
# version or a from-scratch npm ci, so it isn't this repo's cache) that fails
# one attempt in a run and succeeds the next with no code or environment
# change. `.next` is wiped between attempts since a half-written Turbopack
# cache from the failed attempt is the more likely thing to make attempt 2
# fail the same way, not less.
app_build() {
  local attempt
  for attempt in 1 2 3; do
    npm run build && return 0
    echo "next build attempt $attempt/3 failed" >&2
    rm -rf .next
  done
  return 1
}

# app_stop <port> — kill by port, not by name: Next.js rewrites its process
# title to "next-server (vX)", so a cmdline pattern silently misses live servers.
app_stop() {
  fuser -k "$1/tcp" 2>/dev/null || true
}

# app_start <port> <log> — `next start`, detached. Returns 1 if it never
# answered, 2 if something else answered: a 200 alone isn't proof it's OUR
# server — if the port was already taken, a stale build answers and the whole
# run silently tests old code.
app_start() {
  local port="$1" log="$2" pid
  setsid nohup npx next start -p "$port" > "$log" 2>&1 < /dev/null &
  pid=$!
  disown
  curl --retry 30 --retry-delay 1 --retry-connrefused --retry-all-errors \
    -sf -o /dev/null "http://localhost:$port/" || return 1
  kill -0 "$pid" 2>/dev/null || return 2
}

# app_clear_rate_limits <db-container> — sign-ins from earlier runs saturate
# auth_rate_limits; start every run clean.
app_clear_rate_limits() {
  docker exec "$1" psql -U postgres -d postgres \
    -c 'DELETE FROM public.auth_rate_limits;' \
    -c 'UPDATE public.profiles SET failed_login_attempts = 0, locked_until = NULL
        WHERE failed_login_attempts > 0 OR locked_until IS NOT NULL;'
}
