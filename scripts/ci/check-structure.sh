#!/usr/bin/env bash
# Structural drift checks. Each check exists because the failure it catches
# ALREADY happened in this repo — see .claude/rules/structure.md for the
# incident behind each one.
#
#   check-structure.sh            # C1 fails the build; C2-C5 report only
#   check-structure.sh --strict   # every check fails the build
#
# Read-only. Never writes to the tree.
set -uo pipefail

STRICT=0; UPDATE=0
case "${1:-}" in
  --strict) STRICT=1 ;;
  --update-baseline) UPDATE=1 ;;
esac

RED=$'\033[0;31m'; YEL=$'\033[1;33m'; GRN=$'\033[0;32m'; DIM=$'\033[2m'; OFF=$'\033[0m'
errors=0; warns=0; accepted=0

# Ratchet. Findings already in the baseline are pre-existing and accepted; only
# NEW ones warn. Without this the checker becomes the thing it exists to
# prevent — a growing warning count nobody reads (see .claude/rules/structure.md,
# "a rule with no consequence is decoration").
#   review, then: bash scripts/ci/check-structure.sh --update-baseline
BASELINE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.structure-baseline"
[ -f "$BASELINE" ] || : > "$BASELINE"
NEWFILE=$(mktemp); trap 'rm -f "$NEWFILE"' EXIT

hdr()  { printf '\n%s%s%s\n' "$DIM" "$1" "$OFF"; }
fail() { printf '%s  ✗ %s%s\n' "$RED" "$1" "$OFF"; errors=$((errors+1)); }
ok()   { printf '%s  ✓ %s%s\n' "$GRN" "$1" "$OFF"; }
# warn <stable-id> <message>
warn() {
  echo "$1" >> "$NEWFILE"
  if grep -qxF "$1" "$BASELINE" 2>/dev/null; then
    accepted=$((accepted+1))
  else
    printf '%s  ! %s%s\n' "$YEL" "$2" "$OFF"; warns=$((warns+1))
  fi
}

SRC_DIRS="lib components app hooks schemas types"

# ---------------------------------------------------------------------------
# C1 — a name is a file OR a directory, never both.            [HARD FAIL]
#
# Incident: lib/supabase.ts sat beside lib/supabase/. The file wins module
# resolution, so lib/supabase/index.ts was unreachable — and that unreachable
# barrel exported a SECOND authenticateRequest with a different signature from
# the live one in lib/auth/api-auth.ts. Undetectable by tsc; both compiled.
# ---------------------------------------------------------------------------
hdr "C1  file/directory name collisions"
c1=0
for d in $SRC_DIRS; do
  [ -d "$d" ] || continue
  while IFS= read -r f; do
    stem="${f%.ts}"; stem="${stem%.tsx}"
    [ -d "$stem" ] || continue
    if [ -f "$stem/index.ts" ] || [ -f "$stem/index.tsx" ]; then
      # Actively shadowing: the sibling file wins, so the barrel is unreachable.
      fail "$f shadows $stem/index.ts — the file wins resolution, the barrel is unreachable"
    else
      # Latent: nothing is hidden yet, but adding an index.ts silently would be.
      warn "C1 $f" "$f sits beside $stem/ — move it to $stem/index.ts before someone adds one"
    fi
    c1=$((c1+1))
  done < <(find "$d" -name '*.ts' -o -name '*.tsx' 2>/dev/null | grep -vE '\.(test|spec|d)\.' || true)
done
[ "$c1" = "0" ] && ok "no collisions"

# ---------------------------------------------------------------------------
# C2 — a directory with one real module is not a layer.        [report]
#
# Incident: lib/queries/ (1 file), lib/repositories/ (1 file) and lib/mutations/
# (0 consumers) advertised a repository architecture the codebase did not have.
# The work had gone into lib/services/ instead.
# ---------------------------------------------------------------------------
# Scoped to DIRECT children of lib/ — those are claimed architectural layers.
# app/ is excluded outright: the App Router *requires* one directory per route,
# so a page.tsx alone in a folder is the convention, not a smell. Deeper
# component folders are grouping, not layering.
hdr "C2  single-module layers (direct children of lib/)"
c2=0
if [ -d lib ]; then
  while IFS= read -r dir; do
    n=$(find "$dir" -maxdepth 1 -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null \
        | grep -vE '/(index|types|constants)\.tsx?$' | grep -vE '\.(test|spec)\.' | wc -l | tr -d ' ')
    subdirs=$(find "$dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | grep -cv '__tests__' | tr -d ' ')
    if [ "$n" = "1" ] && [ "$subdirs" = "0" ]; then
      warn "C2 $dir" "$dir/ holds a single module — a layer needs more than one, or it is just a file"
      c2=$((c2+1))
    fi
  done < <(find lib -mindepth 1 -maxdepth 1 -type d ! -name '__tests__' 2>/dev/null | sort)
fi
[ "$c2" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C3 — version//age suffixes need an end date.                 [report]
#
# Incident: components/v2/ (50 files) has run in parallel with the v1 tree for
# months. A version-numbered directory with no completion criterion is
# permanent by default, and it duplicates names (AppShell, Header, StatusBadge,
# StepWizardForm all exist twice).
# ---------------------------------------------------------------------------
# app/ is excluded: "new" and "edit" are CRUD route segments there
# (app/dashboard/songs/new = create a song), not version markers. Only
# unambiguous version/age words count.
hdr "C3  version / age suffixed paths"
c3=0
while IFS= read -r p; do
  warn "C3 $p" "$p — name it for what it is, or record the cutover task that deletes it"
  c3=$((c3+1))
done < <(git ls-files lib components hooks schemas types 2>/dev/null \
  | tr '/' '\n' | grep -xE 'v[0-9]+|legacy|deprecated' -m0 >/dev/null 2>&1; \
  git ls-files lib components hooks schemas types 2>/dev/null \
  | awk -F/ '{acc="";for(i=1;i<NF;i++){acc=(i==1?$i:acc"/"$i); if ($i ~ /^(v[0-9]+|legacy|deprecated)$/) print acc}}' \
  | sort -u)
[ "$c3" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C4 — one exported name, one definition (in lib/).            [report]
#
# Incident: TWO authenticateRequest (incompatible signatures), TWO useAuth, TWO
# Role. Domain components may legitimately repeat a name; shared infrastructure
# may not — a duplicate there is a coin-flip at the import site.
# ---------------------------------------------------------------------------
# Functions only. A repeated *type* name in two adjacent service files is
# usually harmless; a repeated *function* name is the substitutability trap —
# two authenticateRequest with different signatures is what actually bit.
# Test mocks are excluded (a mock is meant to shadow the real thing).
hdr "C4  duplicate exported functions in lib/"
c4=0
if [ -d lib ]; then
  while IFS= read -r line; do
    sym="${line##* }"; cnt="${line%% *}"
    files=$(grep -rlE "^export (async )?function $sym\b" lib --include='*.ts' --include='*.tsx' 2>/dev/null \
            | grep -v '__mocks__' | tr '\n' ' ')
    [ -z "$files" ] && continue
    warn "C4 $sym" "$sym() defined ${cnt}x — $files"
    c4=$((c4+1))
  done < <(grep -rhoE "^export (async )?function [A-Za-z_][A-Za-z0-9_]*" lib \
      --include='*.ts' --include='*.tsx' 2>/dev/null \
      | grep -v '__mocks__' \
      | sed -E 's/.* //' | sort | uniq -c | awk '$1>1' | sed 's/^ *//')
fi
[ "$c4" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C5 — code nobody imports but somebody still edits.           [report]
#
# Incident: components/auth/AuthProvider.tsx is deprecated in a barrel comment,
# is not mounted, has no consumers — and received a TIER 0 auth fix. Effort was
# going into code that does not run. If it is worth fixing it is worth
# mounting; otherwise delete it.
# ---------------------------------------------------------------------------
hdr "C5  unimported modules edited in the last 60 days"
c5=0
if [ "${ACT:-}" = "true" ]; then
  ok "skipping C5 in local act run to avoid fresh clone log false-positives"
else
  since=$(date -v-60d +%Y-%m-%d 2>/dev/null || date -d '60 days ago' +%Y-%m-%d 2>/dev/null || echo "1970-01-01")

  # Build the set of imported module stems ONCE. The naive version grepped the
  # whole tree per candidate — 2,000+ candidates x a full-tree grep, which took
  # minutes. A check too slow to run is a check nobody runs.
  IMPORTS=$(mktemp); trap 'rm -f "$NEWFILE" "$IMPORTS"' EXIT
  # MUST cover dynamic import() and jest.mock() as well as static `from`. An
  # earlier version matched only `from`/`require(`, so every React.lazy target
  # (ChapterReader.Desktop, AppShell.Desktop, …) looked unimported and got
  # baselined as a false positive.
  grep -rhoE "(from|import[[:space:]]*\(|require[[:space:]]*\(|jest\.mock[[:space:]]*\()[[:space:]]*['\"][^'\"]+['\"]" $SRC_DIRS scripts tests __tests__ \
       --include='*.ts' --include='*.tsx' 2>/dev/null \
    | sed -E "s/.*['\"]([^'\"]+)['\"].*/\1/" \
    | sed -E 's|.*/||' \
    | sort -u > "$IMPORTS"

  while IFS= read -r f; do
    case "$f" in
      */index.ts|*/index.tsx) continue ;;
      *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*.d.ts) continue ;;
      app/*) continue ;;              # Next.js routes are entry points, never imported
      */__mocks__/*) continue ;;      # jest resolves these by config, not by import
      */jest.setup*|*/jest.global*) continue ;;
    esac
    base=$(basename "$f"); stem="${base%.*}"
    if ! grep -qxF "$stem" "$IMPORTS"; then
      warn "C5 $f" "$f — no importer, yet modified since $since"
      c5=$((c5+1))
    fi
  done < <(git log --since="$since" --name-only --pretty=format: -- $SRC_DIRS 2>/dev/null \
          | grep -E '\.(ts|tsx)$' | sort -u | grep -xFf <(git ls-files $SRC_DIRS))
  [ "$c5" = "0" ] && ok "none"
fi

# ---------------------------------------------------------------------------
# C6 — one file-naming convention under components/.            [report]
#
# Incident: support modules carried FOUR prefix styles at once — kebab
# (song-picker.helpers.ts), lowercase (sidebar.helpers.ts), PascalCase
# (LessonsList.helpers.ts) and camelCase (apiKeyManager.types.ts) — and twelve
# modules had no qualifier at all. `format.ts` existed 3x and `primitives.tsx`
# 4x in different domains, each exporting a different `Card`, so an import site
# said nothing about what you were getting. Directories were split 5 PascalCase
# to 28 kebab. Settled 2026-07-31: see "File Naming" in .claude/rules/code-style.md.
#
# Adding a role? Extend C6_ROLES *and* the table in code-style.md together.
# ---------------------------------------------------------------------------
hdr "C6  components/ file + directory naming"
c6=0
C6_ROLES='helpers|types|constants|styles|data|i18n|shared'

# components/ui is the shadcn registry — it keeps that project's filenames.
while IFS= read -r f; do
  case "$f" in components/ui/*) continue ;; esac
  base=$(basename "$f")
  # Tests inherit their subject's name; strip the flavor before matching.
  subject=$(printf '%s' "$base" | sed -E 's/\.(unit|integration|e2e)?\.?(test|spec)\.(tsx?)$/.\3/')
  if printf '%s' "$subject" | grep -qE "^(index\.tsx?|[A-Z][A-Za-z0-9]*(\.[A-Za-z0-9]+)*\.tsx?|use[A-Z][A-Za-z0-9]*(\.($C6_ROLES))?\.tsx?|[a-z0-9]+(-[a-z0-9]+)*\.($C6_ROLES)\.tsx?)$"; then
    continue
  fi
  warn "C6 $f" "$f — not a component, sub-component, hook, ${C6_ROLES//|/ / } module, or index"
  c6=$((c6+1))
done < <(git ls-files 'components/**/*.ts' 'components/**/*.tsx' 'components/*.ts' 'components/*.tsx' 2>/dev/null)

while IFS= read -r d; do
  case "$d" in components/ui|components/ui/*) continue ;; esac
  name=$(basename "$d")
  [ "$name" = "__mocks__" ] && continue
  if [ "$name" = "__tests__" ]; then
    warn "C6 $d" "$d — tests are colocated under components/, not in __tests__/"
    c6=$((c6+1)); continue
  fi
  if ! printf '%s' "$name" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$'; then
    warn "C6 $d" "$d — directory names are kebab-case (a directory names a role, not a component)"
    c6=$((c6+1))
  fi
done < <(git ls-files 'components/**' 2>/dev/null | xargs -n1 dirname 2>/dev/null | sort -u | grep -v '^components$')
[ "$c6" = "0" ] && ok "one convention, no drift"

# ---------------------------------------------------------------------------
# C7 — raw fetch() is discouraged.                              [report]
#
# Incident: Multiple coexisting read patterns. Client components should route
# queries through the API client wrapper (apiClient) or custom query hooks to
# centralize header injection, error logging, and standard response formats.
# ---------------------------------------------------------------------------
hdr "C7  raw fetch() usage in components/app"
c7=0
while IFS= read -r f; do
  case "$f" in
    app/api/* | */__tests__/* | *.test.ts | *.test.tsx | *.spec.ts | *.spec.tsx | lib/api-client.ts) continue ;;
  esac
  if grep -rnEh '\bfetch\(' "$f" | grep -vE '^[0-9]+:[[:space:]]*//' | grep -vE '^[0-9]+:[[:space:]]*/\*' | grep -vE '^[0-9]+:[[:space:]]*\*' >/dev/null 2>&1; then
    warn "C7 $f" "$f — uses raw fetch(), migrate to apiClient or use Server Actions / custom hooks"
    c7=$((c7+1))
  fi
done < <(git ls-files 'components/**/*.ts' 'components/**/*.tsx' 'components/*.ts' 'components/*.tsx' 'app/**/*.ts' 'app/**/*.tsx' 'app/*.ts' 'app/*.tsx' 2>/dev/null)
[ "$c7" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C8 — direct client-side Supabase access is discouraged.       [report]
#
# Incident: Client components querying Supabase directly bypasses API routing,
# middleware policies, and query caching, leading to data sprawl and RLS bypasses.
# Database operations should be handled in server-side query services or actions.
# ---------------------------------------------------------------------------
hdr "C8  direct browser supabase client in components/app"
c8=0
while IFS= read -r f; do
  case "$f" in
    app/api/* | */__tests__/* | *.test.ts | *.test.tsx | *.spec.ts | *.spec.tsx) continue ;;
  esac
  if grep -rnEh 'from '\''@/lib/supabase/client'\''|from "@/lib/supabase/client"|from '\''@supabase/supabase-js'\''|from "@supabase/supabase-js"' "$f" >/dev/null 2>&1; then
    warn "C8 $f" "$f — imports client-side Supabase directly, database access should go through Server Components or actions"
    c8=$((c8+1))
  fi
done < <(git ls-files 'components/**/*.ts' 'components/**/*.tsx' 'components/*.ts' 'components/*.tsx' 'app/**/*.ts' 'app/**/*.tsx' 'app/*.ts' 'app/*.tsx' 2>/dev/null)
[ "$c8" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C9 — conforming database migrations                           [HARD FAIL]
#
# Incident: Non-timestamped files or backup scripts in supabase/migrations/
# sort out of order, break migrations, and drift between environments.
# ---------------------------------------------------------------------------
hdr "C9  database migration file naming"
c9=0
while IFS= read -r f; do
  # Ignore baseline and rollback directory
  case "$f" in
    supabase/migrations/00000000000000_baseline.sql | supabase/migrations/rollback/*) continue ;;
  esac
  name=$(basename "$f")
  if ! [[ "$name" =~ ^[0-9]{14}_[a-zA-Z0-9_]+\.sql$ ]]; then
    fail "$f — migration files must follow format YYYYMMDDHHMMSS_description.sql"
    c9=$((c9+1))
  fi
done < <(git ls-files 'supabase/migrations/*' 2>/dev/null)
[ "$c9" = "0" ] && ok "all migrations conform"

# ---------------------------------------------------------------------------
# C10 — client-side secret exposure prevention                  [HARD FAIL]
#
# Incident: Accessing private server environment variables in client-side code
# compiles fine but returns undefined or leaks credentials to client bundles.
# ---------------------------------------------------------------------------
hdr "C10 client-side secret exposure check"
c10=0
while IFS= read -r f; do
  case "$f" in
    */__tests__/* | *.test.ts | *.test.tsx | *.spec.ts | *.spec.tsx) continue ;;
  esac
  bad_envs=$(grep -rnh 'process.env.' "$f" | grep -vE '^[0-9]+:[[:space:]]*//' | grep -vE '^[0-9]+:[[:space:]]*/\*' | grep -vE '^[0-9]+:[[:space:]]*\*' | grep -vE 'process\.env\.NEXT_PUBLIC_[A-Z0-9_]+|process\.env\.NODE_ENV' || true)
  if [ -n "$bad_envs" ]; then
    fail "$f — references server-side environment variables directly on the client: $bad_envs"
    c10=$((c10+1))
  fi
done < <(git ls-files 'components/**/*.ts' 'components/**/*.tsx' 'components/*.ts' 'components/*.tsx' 2>/dev/null)
[ "$c10" = "0" ] && ok "no client-side secret access"

# ---------------------------------------------------------------------------
# C11 — server-side logging consistency                        [report]
#
# Incident: API routes, Actions, and Services calling console.log bypass the
# unified Pino structured logging interface, making production debugging hard.
# ---------------------------------------------------------------------------
hdr "C11 server-side raw console.log checks"
c11=0
while IFS= read -r f; do
  case "$f" in
    */__tests__/* | *.test.ts | *.test.tsx | *.spec.ts | *.spec.tsx) continue ;;
  esac
  if grep -rnEh 'console\.log\(' "$f" | grep -vE '^[0-9]+:[[:space:]]*//' | grep -vE '^[0-9]+:[[:space:]]*/\*' | grep -vE '^[0-9]+:[[:space:]]*\*' >/dev/null 2>&1; then
    warn "C11 $f" "$f — uses console.log(), use @/lib/logger for structured operational logs"
    c11=$((c11+1))
  fi
done < <(git ls-files 'app/actions/**/*.ts' 'app/api/**/*.ts' 'lib/services/**/*.ts' 2>/dev/null)
[ "$c11" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C12 — enforce component and hook file size limits            [report]
#
# Incident: Components and hooks slowly ballooning to 500+ lines because
# ESLint size checks were only advisory warnings.
# ---------------------------------------------------------------------------
hdr "C12 file size limits (components max 200, hooks max 150)"
c12=0
while IFS= read -r f; do
  case "$f" in
    */__tests__/* | *.test.ts | *.test.tsx | *.spec.ts | *.spec.tsx | components/ui/*) continue ;;
  esac
  
  lines=$(wc -l < "$f" | tr -d ' ')
  
  if [[ "$f" == *"/hooks/"* || $(basename "$f") == use* ]]; then
    limit=150
    kind="hook"
  else
    limit=200
    kind="component"
  fi
  
  if [ "$lines" -gt "$limit" ]; then
    warn "C12 $f" "$f — $kind file is $lines lines (max limit: $limit)"
    c12=$((c12+1))
  fi
done < <(git ls-files 'components/**/*.ts' 'components/**/*.tsx' 'components/*.ts' 'components/*.tsx' 'hooks/**/*.ts' 'hooks/**/*.tsx' 'hooks/*.ts' 'hooks/*.tsx' 2>/dev/null)
[ "$c12" = "0" ] && ok "all files within limits"

# ---------------------------------------------------------------------------
if [ "$UPDATE" = "1" ]; then
  sort -u "$NEWFILE" > "$BASELINE"
  printf '\n%sBaseline updated: %d accepted finding(s) in %s%s\n' \
    "$GRN" "$(wc -l < "$BASELINE" | tr -d ' ')" "${BASELINE#"$PWD"/}" "$OFF"
  exit 0
fi

# Findings that have been FIXED can leave the baseline — otherwise it rots the
# same way the stale docs did.
stale=$(comm -23 <(sort -u "$BASELINE") <(sort -u "$NEWFILE") | wc -l | tr -d ' ')

printf '\n'
if [ "$errors" -gt 0 ]; then
  printf '%s%d structural error(s)%s · %d new warning(s) · %d accepted\n' \
    "$RED" "$errors" "$OFF" "$warns" "$accepted"
  printf '%sSee .claude/rules/structure.md for the incident behind each check.%s\n' "$DIM" "$OFF"
  exit 1
fi
if [ "$warns" -gt 0 ]; then
  printf '%s%d NEW warning(s)%s · %d accepted in baseline\n' "$YEL" "$warns" "$OFF" "$accepted"
  printf '%sFix them, or accept with: bash scripts/ci/check-structure.sh --update-baseline%s\n' "$DIM" "$OFF"
  [ "$STRICT" = "1" ] && { printf '%s--strict: failing on new warnings%s\n' "$RED" "$OFF"; exit 1; }
  exit 0
fi
printf '%sStructure clean — no new findings%s (%d accepted in baseline' "$GRN" "$OFF" "$accepted"
[ "$stale" -gt 0 ] && printf ', %d now fixed — run --update-baseline to prune' "$stale"
printf ').\n'
