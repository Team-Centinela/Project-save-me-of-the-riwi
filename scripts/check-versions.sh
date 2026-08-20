#!/usr/bin/env bash
# =============================================================================
# check-versions.sh — Compare installed packages against the latest stable
# release on the registry and flag deprecated ones.
# With --gate: exits non-zero if any package is deprecated (used by verify.sh).
# Without --gate: prints a table for human consumption.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

GATE="${1:-}"
FAILED=0

deps=$(node -p "const p=require('./package.json');Object.keys({...p.dependencies,...p.devDependencies}).join('\n')")

printf '%-40s %-14s %-14s %s\n' "PACKAGE" "INSTALLED" "LATEST" "STATUS"

while IFS= read -r dep; do
  [ -z "$dep" ] && continue
  installed=$(node -p "try{require('$dep/package.json').version}catch(e){'?'}" 2>/dev/null || echo '?')
  latest=$(pnpm view "$dep" version 2>/dev/null || echo '?')
  deprecated=$(pnpm view "$dep" deprecated 2>/dev/null || true)
  status="ok"
  if [ -n "$deprecated" ]; then
    status="DEPRECATED"
    FAILED=1
  elif [ "$installed" != "$latest" ] && [ "$installed" != "?" ] && [ "$latest" != "?" ]; then
    status="has $latest"
  fi
  printf '%-40s %-14s %-14s %s\n' "$dep" "$installed" "$latest" "$status"
done <<< "$deps"

if [ "$GATE" = "--gate" ] && [ "$FAILED" -ne 0 ]; then
  echo "✖ Deprecated dependencies detected. Replace them with their documented successor." >&2
  exit 1
fi