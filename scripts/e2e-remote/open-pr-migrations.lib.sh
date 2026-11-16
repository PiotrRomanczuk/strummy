#!/usr/bin/env bash
# Migrations of OTHER open pull requests that may already sit in the shared dev
# database (#1100).
#
# The repo rules let a branch apply its migration to StrummyDevelopment before
# it merges, so dev can be ahead of main by several open PRs at once. db-parity
# and migrations-replay compare against dev, so one PR's early migration turned
# every other open PR red (2026-11-14: song_analysis_sources from #1005 failed
# #1027, #1086 and #1088).
#
# reconcile_open_pr_migrations tries each other PR's migrations on a COPY of
# the scratch database and keeps them only when they bring it closer to dev.
# A PR whose migration was never applied to dev therefore changes nothing, and
# an object no open PR explains still fails the check.
#
# The SQL comes from branches of this repository only (the CI step skips
# forks): it runs as postgres inside the dev container's scratch databases.
#
# Requires schema-dump.lib.sh to be sourced first.

# reconcile_open_pr_migrations CONTAINER SHADOW_DB TARGET_DUMP_FILE LOG
#   OPEN_PR_MIGRATIONS_DIR: one sub-directory per PR number holding its added
#   .sql files (prepared by the CI step). Missing or empty = nothing to do.
# Leaves SHADOW_DB with the helpful PRs applied. Prints what it kept to stderr.
reconcile_open_pr_migrations() {
  local container="$1" shadow="$2" target="$3" log="$4"
  local dir="${OPEN_PR_MIGRATIONS_DIR:-}"
  [ -n "$dir" ] && [ -d "$dir" ] || return 0

  local trial="${shadow}_trial" best lines pr file ok
  best=$(diff <(dump_public_schema "$container" "$shadow") "$target" | wc -l | tr -d ' ')

  for pr in $(find "$dir" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort -n); do
    [ "$best" = "0" ] && break
    docker exec "$container" psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 \
      -c "drop database if exists \"$trial\" with (force)" \
      -c "create database \"$trial\" template \"$shadow\"" >> "$log" 2>&1 || continue

    ok=1
    for file in $(find "$dir/$pr" -maxdepth 1 -name '*.sql' | sort); do
      echo "--- open PR #$pr: $(basename "$file")" >> "$log"
      psql_into "$container" "$trial" < "$file" >> "$log" 2>&1 || { ok=0; break; }
    done

    if [ "$ok" = "1" ]; then
      lines=$(diff <(dump_public_schema "$container" "$trial") "$target" | wc -l | tr -d ' ')
      if [ "$lines" -lt "$best" ]; then
        echo "  + open PR #$pr's migrations are already in dev ($best → $lines diff lines)" >&2
        best="$lines"
        docker exec "$container" psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 \
          -c "drop database if exists \"$shadow\" with (force)" \
          -c "alter database \"$trial\" rename to \"$shadow\"" >> "$log" 2>&1 || return 2
        continue
      fi
    fi
    docker exec "$container" psql -U postgres -d postgres -q \
      -c "drop database if exists \"$trial\" with (force)" >> "$log" 2>&1
  done
  return 0
}
