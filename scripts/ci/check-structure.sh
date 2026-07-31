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
        | grep -E '\.(ts|tsx)$' | sort -u | while IFS= read -r p; do [ -f "$p" ] && echo "$p"; done)
[ "$c5" = "0" ] && ok "none"

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
