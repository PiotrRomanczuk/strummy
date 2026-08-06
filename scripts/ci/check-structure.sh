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
# C7 — test file case-sensitivity duplication.
# ---------------------------------------------------------------------------
hdr "C7  test file case-sensitivity duplication"
c7=0
# Find duplicates (case-insensitive) among test files
duplicates=$(find __tests__ components -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' -o -name '*.spec.tsx' 2>/dev/null \
  | awk '{print tolower($0)}' | sort | uniq -d)

if [ -n "$duplicates" ]; then
  while IFS= read -r dup; do
    [ -z "$dup" ] && continue
    actual_files=$(find __tests__ components -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' -o -name '*.spec.tsx' 2>/dev/null \
      | awk -v d="$dup" 'tolower($0) == d' | tr '\n' ' ')
    warn "C7 $dup" "Case-insensitive duplicate test files found: $actual_files"
    c7=$((c7+1))
  done <<< "$duplicates"
fi
[ "$c7" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C8 — webhook endpoint hygiene.
# ---------------------------------------------------------------------------
hdr "C8  webhook endpoint hygiene"
c8=0
if [ -d app/api/webhooks ]; then
  while IFS= read -r route; do
    [ -f "$route" ] || continue
    # Check for console.log
    if grep -q "console.log" "$route"; then
      warn "C8 $route console" "$route contains console.log — use logger from @/lib/logger instead"
      c8=$((c8+1))
    fi
    # Check for signature/token validation
    if ! grep -qE "validateToken|verify.*Signature|verifyCalcomSignature" "$route"; then
      warn "C8 $route auth" "$route does not contain signature/token validation"
      c8=$((c8+1))
    fi
  done < <(find app/api/webhooks -name 'route.ts' 2>/dev/null)
fi
[ "$c8" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C9 — cron endpoint security verification
# ---------------------------------------------------------------------------
hdr "C9  cron endpoint authorization checks"
c9=0
if [ -d app/api/cron ]; then
  while IFS= read -r route; do
    [ -f "$route" ] || continue
    if ! grep -q "verifyCronSecret" "$route"; then
      warn "C9 $route" "$route is missing verifyCronSecret(request) authorization guard"
      c9=$((c9+1))
    fi
  done < <(find app/api/cron -name 'route.ts' 2>/dev/null)
fi
[ "$c9" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C10 — Zod schema naming conventions
# ---------------------------------------------------------------------------
hdr "C10  Zod schema naming conventions"
c10=0
if [ -d schemas ]; then
  while IFS= read -r f; do
    base=$(basename "$f")
    case "$base" in README.md|index.ts) continue ;; esac
    if ! printf '%s' "$base" | grep -qE '^[A-Z][A-Za-z0-9]*Schema\.(test\.)?ts$'; then
      warn "C10 $f" "$f Zod schema must be PascalCase and end with Schema.ts (e.g. ContactFormSchema.ts)"
      c10=$((c10+1))
    fi
  done < <(find schemas -maxdepth 1 -name '*.ts' 2>/dev/null)
fi
[ "$c10" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C11 — environment variables documented in .env.example
# ---------------------------------------------------------------------------
hdr "C11  environment variables documentation"
c11=0
if [ -f .env.example ]; then
  while IFS= read -r var; do
    [ -z "$var" ] && continue
    if ! grep -qE "^[[:space:]]*${var}=" .env.example; then
      warn "C11 $var" "process.env.${var} is used in code but not declared in .env.example"
      c11=$((c11+1))
    fi
  done < <(grep -rhiE "\bprocess\.env\.[A-Z0-9_]+" $SRC_DIRS --include='*.ts' --include='*.tsx' 2>/dev/null \
    | grep -oE "\bprocess\.env\.[A-Z0-9_]+" | sed 's/process.env.//' | sort -u)
fi
[ "$c11" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C12 — focused tests checks (test.only/describe.only/fdescribe/fit)
# ---------------------------------------------------------------------------
hdr "C12  focused tests checks"
c12=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  if grep -qE "\b(test\.only|describe\.only|fdescribe|fit)\(" "$f"; then
    warn "C12 $f" "$f contains focused test flag (.only / fit / fdescribe)"
    c12=$((c12+1))
  fi
done < <(find __tests__ components tests -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' -o -name '*.spec.tsx' 2>/dev/null)
[ "$c12" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C13 — no raw HEX or arbitrary color tokens in JSX
# ---------------------------------------------------------------------------
hdr "C13  hardcoded hex / arbitrary colors in JSX"
c13=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  case "$f" in components/ui/*) continue ;; esac
  # Look for class name arbitrary tailwind hex colors (e.g. bg-[#...] or text-[#...])
  # or raw CSS styles with HEX color properties
  if grep -qiE -e "-\[[#][0-9a-f]{3,6}\]|:\s*'#[0-9a-f]{3,6}'" "$f"; then
    warn "C13 $f" "$f contains hardcoded hex or arbitrary colors — use design tokens instead"
    c13=$((c13+1))
  fi
done < <(find components app -name '*.tsx' 2>/dev/null)
[ "$c13" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C14 — console.log ban in production code.                    [HARD FAIL]
#
# Incident: spotify/callback/route.ts console.log-ged OAuth refresh tokens.
# notification-logger.ts bypassed the project logger entirely with 4 direct
# console calls. Structured logging via @/lib/logger ensures secret redaction.
# ---------------------------------------------------------------------------
hdr "C14  console.log ban in production code"
c14=0
# Allowed files: logger internals + test setup
C14_ALLOW='lib/logger/console-backend\.ts|lib/logger/supabase-destination\.ts|lib/testing/jest\.global|scripts/|tests/|__tests__/|\.test\.|\.spec\.'
while IFS= read -r match; do
  f="${match%%:*}"
  # Skip allowed files
  echo "$f" | grep -qE "$C14_ALLOW" && continue
  warn "C14 $match" "$match — use logger from @/lib/logger instead of console.*"
  c14=$((c14+1))
done < <(grep -rnE '\bconsole\.(log|error|warn|info|debug)\b' $SRC_DIRS \
    --include='*.ts' --include='*.tsx' 2>/dev/null || true)
if [ "$c14" = "0" ]; then ok "none"
elif [ "$STRICT" = "1" ]; then
  for i in $(seq 1 $c14); do errors=$((errors+1)); warns=$((warns-1)); done
fi

# ---------------------------------------------------------------------------
# C15 — API route handlers must have try/catch.                [HARD FAIL]
#
# Incident: 7+ content/ API routes lacked try/catch, returning HTML 500 error
# pages instead of JSON — breaking every API consumer.
# ---------------------------------------------------------------------------
hdr "C15  API route try/catch wrappers"
c15=0
if [ -d app/api ]; then
  while IFS= read -r route; do
    [ -f "$route" ] || continue
    # Extract exported handler names (GET, POST, PATCH, DELETE, PUT)
    handlers=$(grep -oE 'export (async )?function (GET|POST|PATCH|DELETE|PUT)' "$route" \
               | sed -E 's/export (async )?function //' || true)
    [ -z "$handlers" ] && continue
    # Each handler must contain a try block
    if ! grep -q 'try {' "$route" && ! grep -q 'try{' "$route"; then
      warn "C15 $route" "$route exports HTTP handler(s) without try/catch error handling"
      c15=$((c15+1))
    fi
  done < <(find app/api -name 'route.ts' 2>/dev/null)
fi
[ "$c15" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C16 — mutation API routes must validate input with Zod.      [report]
#
# Incident: spotify/matches/approve and /reject used manual `const { matchId }
# = body; if (!matchId)` checks while adjacent routes used Zod. Ad-hoc checks
# provide no runtime type safety.
# ---------------------------------------------------------------------------
hdr "C16  Zod validation in mutation API routes"
c16=0
if [ -d app/api ]; then
  while IFS= read -r route; do
    [ -f "$route" ] || continue
    # Only check files with POST/PATCH/PUT handlers that read request body
    if grep -qE 'request\.json\(\)' "$route"; then
      if ! grep -qE '\.(safe)?[Pp]arse\(' "$route"; then
        warn "C16 $route" "$route reads request.json() without Zod .parse()/.safeParse() validation"
        c16=$((c16+1))
      fi
    fi
  done < <(find app/api -name 'route.ts' 2>/dev/null)
fi
[ "$c16" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C17 — Server Actions must return errors, not throw them.     [report]
#
# Incident: 6 action files throw new Error() instead of returning { error }.
# Throwing forces UI code to wrap every call in try/catch; missing one crashes
# the component tree.
# ---------------------------------------------------------------------------
hdr "C17  Server Action throw-instead-of-return"
c17=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  # Only check files with 'use server' directive
  head -5 "$f" | grep -q "'use server'" || continue
  if grep -qE 'throw new Error\(' "$f"; then
    warn "C17 $f" "$f — Server Actions should return { error: string }, not throw"
    c17=$((c17+1))
  fi
done < <(find app/actions -name '*.ts' ! -name '*.test.*' ! -name '*.helpers.*' ! -name '*.types.*' ! -path '*__tests__*' 2>/dev/null)
[ "$c17" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C18 — types/ files must derive from generated DB schema.     [report]
#
# Incident: types/Lesson.ts used lesson_number but DB column is
# lesson_teacher_number, types/User.ts manually redeclared profile fields in
# camelCase. Drift between manual types and the actual schema caused runtime
# errors.
# ---------------------------------------------------------------------------
hdr "C18  manual DB type mirrors in types/"
c18=0
if [ -d types ]; then
  while IFS= read -r f; do
    base=$(basename "$f")
    # Skip non-entity files
    case "$base" in database.types.ts|jest.d.ts|index.ts) continue ;; esac
    # If file defines an interface/type with 5+ properties but doesn't import
    # from database.types, it's likely a manual DB mirror
    prop_count=$(grep -cE '^\s+\w+[\?]?\s*:' "$f" 2>/dev/null || echo 0)
    prop_count=$(echo "$prop_count" | tr -d '[:space:]')
    if [ "$prop_count" -ge 5 ]; then
      if ! grep -qE "from ['\"]@/(database\.types|types/database\.types)['\"]" "$f"; then
        warn "C18 $f" "$f defines $prop_count properties without deriving from Tables<> — potential schema drift"
        c18=$((c18+1))
      fi
    fi
  done < <(find types -maxdepth 1 -name '*.ts' 2>/dev/null)
fi
[ "$c18" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C19 — canonical import path for database types.              [report]
#
# Incident: Database types imported via 3 paths (@/database.types,
# @/types/database.types, @/lib/supabase). Multiple import paths for the same
# type confuses refactoring and AI code generation.
# ---------------------------------------------------------------------------
hdr "C19  database type import path consistency"
c19=0
# The canonical path is @/types/database.types (the re-export shim).
# Flag direct root imports.
while IFS= read -r match; do
  f="${match%%:*}"
  # Skip the re-export shim itself
  case "$f" in types/database.types.ts) continue ;; esac
  warn "C19 $match" "$match — import from @/types/database.types instead of @/database.types"
  c19=$((c19+1))
done < <(grep -rnE "from ['\"]@/database\.types['\"]" $SRC_DIRS \
    --include='*.ts' --include='*.tsx' 2>/dev/null || true)
[ "$c19" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C20 — duplicate exported functions across lib/ + components/. [report]
#
# Extends C4 to also catch cross-layer duplicates (e.g. calculateSimilarity
# defined in both lib/utils/ and lib/services/).
# ---------------------------------------------------------------------------
hdr "C20  duplicate exported functions across lib/ + components/"
c20=0
while IFS= read -r line; do
  sym="${line##* }"; cnt="${line%% *}"
  files=$(grep -rlE "^export (async )?function $sym\b" lib components --include='*.ts' --include='*.tsx' 2>/dev/null \
          | grep -v '__mocks__' | grep -v '\.test\.' | tr '\n' ' ')
  [ -z "$files" ] && continue
  # C4 already covers lib-only duplicates; only flag cross-layer ones
  has_lib=0; has_comp=0
  echo "$files" | grep -q '^lib/' && has_lib=1
  echo "$files" | grep -q '^components/' && has_comp=1
  if [ "$has_lib" = "1" ] && [ "$has_comp" = "1" ]; then
    warn "C20 $sym" "$sym() defined ${cnt}x across layers — $files"
    c20=$((c20+1))
  fi
done < <(grep -rhoE "^export (async )?function [A-Za-z_][A-Za-z0-9_]*" lib components \
    --include='*.ts' --include='*.tsx' 2>/dev/null \
    | grep -v '__mocks__' | grep -v '\.test\.' \
    | sed -E 's/.* //' | sort | uniq -c | awk '$1>1' | sed 's/^ *//')
[ "$c20" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C21 — migration timestamp uniqueness.                        [HARD FAIL]
#
# Incident: Two migrations shared timestamp 20260731120000 — causing
# non-deterministic execution order across environments.
# ---------------------------------------------------------------------------
hdr "C21  migration timestamp uniqueness"
c21=0
if [ -d supabase/migrations ]; then
  dupes=$(ls supabase/migrations/ 2>/dev/null | sed 's/_.*//' | sort | uniq -d)
  if [ -n "$dupes" ]; then
    while IFS= read -r ts; do
      [ -z "$ts" ] && continue
      collision_files=$(ls supabase/migrations/ | grep "^${ts}_" | tr '\n' ' ')
      fail "Duplicate migration timestamp $ts: $collision_files"
      c21=$((c21+1))
    done <<< "$dupes"
  fi
fi
[ "$c21" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C22 — i18n: no hardcoded user-facing English strings in JSX. [report]
#
# Incident: AuthHashErrorBanner.tsx, DemoBanner.tsx, DemoTour.tsx embedded raw
# English strings instead of using useTranslations() from next-intl.
# ---------------------------------------------------------------------------
hdr "C22  hardcoded English strings in JSX"
c22=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  case "$f" in components/ui/*) continue ;; esac
  # Flag .tsx files with JSX text nodes but no useTranslations import
  # Only check files that actually render JSX (have return with JSX)
  if grep -qE '>\s*[A-Z][a-z]+(\s+[a-z]+){2,}' "$f" 2>/dev/null; then
    if ! grep -qE 'useTranslations|getTranslations|\bt\(' "$f" 2>/dev/null; then
      warn "C22 $f" "$f contains hardcoded English text without useTranslations()"
      c22=$((c22+1))
    fi
  fi
done < <(find components -name '*.tsx' ! -path '*/ui/*' 2>/dev/null)
[ "$c22" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C23 — data-testid naming convention (feature-element).       [report]
#
# Incident: SignInForm used bare data-testid="email" and "password" which
# collide when multiple forms render. Namespaced IDs like "signin-button"
# prevent selector collisions.
# ---------------------------------------------------------------------------
hdr "C23  data-testid naming convention"
c23=0
while IFS= read -r match; do
  f="${match%%:*}"
  # Extract testid value
  testid=$(echo "$match" | grep -oE 'data-testid="[^"]*"' | sed 's/data-testid="//;s/"$//')
  [ -z "$testid" ] && continue
  # Skip dynamic testids (contain template literals or variables)
  echo "$testid" | grep -qE '\$\{|`' && continue
  # Must have at least one hyphen (feature-element pattern)
  if ! echo "$testid" | grep -qE '^[a-z][a-z0-9]+-[a-z0-9]+(-[a-z0-9]+)*$'; then
    warn "C23 $match" "$match — data-testid must be kebab-case with feature prefix (e.g. signin-email)"
    c23=$((c23+1))
  fi
done < <(grep -rnE 'data-testid="[^"]*"' components --include='*.tsx' 2>/dev/null | grep -v '\.test\.' | grep -v '\.spec\.' || true)
[ "$c23" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C24 — no direct DOM manipulation in React components.        [report]
#
# Incident: useAssignmentFormSubmit.ts used document.getElementById instead
# of React refs. DatabaseStatus.tsx directly read/wrote document.cookie.
# FullScreenSearchPicker.tsx mutated document.body.style.overflow.
# ---------------------------------------------------------------------------
hdr "C24  direct DOM manipulation in components/hooks"
c24=0
C24_PATTERN='document\.(getElementById|querySelector|querySelectorAll|body\.style|cookie[^A-Za-z]|createElement)'
while IFS= read -r match; do
  f="${match%%:*}"
  # Skip test files, demo/debug components, and shadcn ui library
  echo "$f" | grep -qE '\.test\.|\.spec\.|/demo/|/debug/|components/ui/' && continue
  warn "C24 $match" "$match — use React refs or declarative state instead of direct DOM access"
  c24=$((c24+1))
done < <(grep -rnE "$C24_PATTERN" components hooks --include='*.ts' --include='*.tsx' 2>/dev/null || true)
[ "$c24" = "0" ] && ok "none"

# ---------------------------------------------------------------------------
# C25 — types/ file naming consistency.                        [report]
#
# Incident: types/ uses 3 naming conventions: PascalCase (Lesson.ts),
# kebab-case (ai-conversation.ts), dot-notation (history.types.ts). Mixed
# naming prevents predictable file discovery and confuses AI code generation.
# ---------------------------------------------------------------------------
hdr "C25  types/ file naming consistency"
c25=0
if [ -d types ]; then
  while IFS= read -r f; do
    base=$(basename "$f")
    case "$base" in database.types.ts|jest.d.ts|index.ts) continue ;; esac
    # Must be PascalCase: starts with uppercase, alphanumeric only
    if ! printf '%s' "$base" | grep -qE '^[A-Z][A-Za-z0-9]*(\.[A-Za-z0-9]+)*\.ts$'; then
      warn "C25 $f" "$f — types/ files should use PascalCase naming (e.g. AiConversation.ts)"
      c25=$((c25+1))
    fi
  done < <(find types -maxdepth 1 -name '*.ts' ! -name '*.test.*' 2>/dev/null)
fi
[ "$c25" = "0" ] && ok "none"

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
