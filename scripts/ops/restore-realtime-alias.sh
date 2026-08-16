#!/usr/bin/env bash
# Restore the `realtime-dev` network alias the Supabase CLI fails to create.
#
# Kong routes the realtime service to `http://realtime-dev:4000/socket`, but the
# realtime container is only ever given the alias `realtime`. The hostname does
# not resolve, so every WebSocket handshake dies inside Kong:
#
#   [lua] init.lua:310: execute(): DNS resolution failed ... "realtime-dev:1 ..."
#   "GET /realtime/v1/websocket?..." 500
#
# The browser sees `Unexpected response code: 500` and retries forever. Nothing
# else breaks, which is why this went unnoticed on BOTH stacks — realtime had
# never worked in production. Kong's own `_comment` on the route says
# `ws://realtime:4000/socket/websocket`, disagreeing with the `url:` beneath it.
#
# Adding the alias is not persistent: `supabase stop/start` recreates the
# container from config.toml and the alias is lost again — the same failure mode
# as GOTRUE_MAILER_URLPATHS_* (see restore-gotrue-mail-urls.py and
# docs/runbooks/supabase-stack-restart.md). Re-run this after any stack restart.
#
# Usage:
#   ./restore-realtime-alias.sh prod   # StudentProduction
#   ./restore-realtime-alias.sh dev    # StudentDevelopment
#   ./restore-realtime-alias.sh both
#
# Runs on `uwh`, where the stacks live — not on the Mac.

set -euo pipefail

apply() {
  local project="$1"
  local container="supabase_realtime_${project}"
  local network="supabase_network_${project}"

  if ! docker inspect "$container" >/dev/null 2>&1; then
    echo "SKIP  ${project}: ${container} not present"
    return 0
  fi

  local aliases
  aliases="$(docker inspect "$container" \
    --format '{{range $k,$v := .NetworkSettings.Networks}}{{$v.Aliases}}{{end}}')"

  if [[ "$aliases" == *realtime-dev* ]]; then
    echo "OK    ${project}: alias already present ${aliases}"
    return 0
  fi

  echo "FIX   ${project}: aliases were ${aliases}, adding realtime-dev"
  # A container can hold one connection per network, so the alias can only be
  # added by reconnecting. Realtime is already unreachable when this is needed,
  # so the brief disconnect costs nothing.
  docker network disconnect "$network" "$container"
  docker network connect --alias realtime --alias realtime-dev "$network" "$container"

  sleep 3
  docker inspect "$container" \
    --format "DONE  ${project}: aliases now {{range \$k,\$v := .NetworkSettings.Networks}}{{\$v.Aliases}}{{end}}"
}

verify() {
  local project="$1" port="$2"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' \
    "http://localhost:${port}/realtime/v1/websocket?vsn=2.0.0" || true)"
  # 500 means Kong still cannot resolve the upstream. Anything else (400 for a
  # non-upgrade GET, 403 for a missing key) means the request reached realtime.
  if [[ "$code" == "500" ]]; then
    echo "FAIL  ${project}: Kong still returns 500 — alias did not take"
    return 1
  fi
  echo "PASS  ${project}: Kong returns ${code} (reached realtime, not a DNS failure)"
}

case "${1:-both}" in
  prod) apply StudentProduction; verify StudentProduction 54321 ;;
  dev)  apply StudentDevelopment; verify StudentDevelopment 55321 ;;
  both)
    apply StudentProduction; verify StudentProduction 54321
    apply StudentDevelopment; verify StudentDevelopment 55321
    ;;
  *) echo "usage: $0 [prod|dev|both]" >&2; exit 2 ;;
esac
