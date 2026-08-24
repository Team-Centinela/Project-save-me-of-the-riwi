#!/usr/bin/env bash
# merge-strategy.sh — apply the hybrid merge strategy from
# CONTRIBUTING.md "Merge strategy — hybrid, on purpose" to the repo via
# the GitHub REST API. Requires a token with admin rights on the repo.
#
# Usage:
#   GITHUB_TOKEN=ghp_xxx bash scripts/merge-strategy.sh
#
# Idempotent: running twice produces the same state. Safe to re-run
# after CONTRIBUTING.md changes the ruleset.
#
# Why a script: the ruleset is the single source of truth in
# CONTRIBUTING.md. This script encodes that table so the settings can
# be reproduced by any maintainer without copy-pasting from the docs.
# Issue #29.

set -euo pipefail

OWNER="${OWNER:-Team-Centinela}"
REPO="${REPO:-Project-save-me-of-the-riwi}"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN is required (admin scope)." >&2
  exit 2
fi

body='{
  "allow_squash_merge": true,
  "allow_merge_commit": true,
  "allow_rebase_merge": false,
  "allow_auto_merge": true,
  "delete_branch_on_merge": true,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY"
}'

echo "→ Applying merge settings to ${OWNER}/${REPO}"
gh api \
  --method PATCH \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/${OWNER}/${REPO}" \
  --input - <<<"$body" >/dev/null

echo "✔ Merge settings applied: squash+merge-commit enabled, rebase disabled, auto-merge on, head branches auto-deleted, squash uses PR title + body."
