#!/usr/bin/env bash
# =============================================================================
# verify.sh — THE quality gate.
# Contract: exit 0 ⇒ format + lint with zero warnings + strict types +
#           tests green + build succeeds + no deprecated dependencies.
# Used by: .husky/pre-commit (--quick), .husky/pre-push (--full), and CI (--full).
# Never skipped, never weakened "to make it pass": fix the code instead.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:---full}"
case "$MODE" in
  --quick | --full) ;;
  *) echo "usage: verify.sh [--quick|--full]" >&2; exit 2 ;;
esac

BLUE='\033[1;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

step() { printf '\n%b▶ %s%b\n' "$BLUE" "$1" "$NC"; }
fail() { printf '\n%b✖ GATE RED — %s%b\n' "$RED" "$1" "$NC" >&2; exit 1; }

START=$(date +%s)

step "[1/5] Format — Prettier"
pnpm format:check || fail "files are not formatted (run: pnpm format)"

step "[2/5] Linter — ESLint, zero warnings"
pnpm lint || fail "the linter found problems"

step "[3/5] Types — tsc --noEmit"
pnpm check-types || fail "type errors"

if [ "$MODE" = "--quick" ]; then
  printf '\n%b✔ QUICK GATE GREEN in %ss%b\n' "$GREEN" "$(( $(date +%s) - START ))" "$NC"
  exit 0
fi

step "[4/5] Tests — Vitest with coverage"
pnpm test || fail "tests failed or coverage below threshold"

step "[5/5] Production build"
pnpm build || fail "the build failed"

bash scripts/check-versions.sh --gate || fail "a dependency is deprecated"

printf '\n%b✔ FULL GATE GREEN in %ss%b\n' "$GREEN" "$(( $(date +%s) - START ))" "$NC"