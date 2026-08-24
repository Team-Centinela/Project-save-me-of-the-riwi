#!/usr/bin/env bash
# branch-protection.sh — apply the branch-protection rules from
# CONTRIBUTING.md "Branch protection" to `main` and `develop` via the
# GitHub REST API. Requires a token with admin rights on the repo
# (fine-grained: Repository → Administration → Write; classic: `repo`).
#
# Usage:
#   GITHUB_TOKEN=ghp_xxx bash scripts/branch-protection.sh
#
# Idempotent: running twice produces the same state. Safe to re-run
# after CONTRIBUTING.md changes the ruleset.
#
# Why a script: the ruleset is the single source of truth in
# CONTRIBUTING.md. This script encodes that table so the settings can
# be reproduced by any maintainer without copy-pasting from the docs.

set -euo pipefail

OWNER="${OWNER:-Team-Centinela}"
REPO="${REPO:-Project-save-me-of-the-riwi}"
BRANCHES=("main" "develop")

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN is required (admin scope)." >&2
  exit 2
fi

api() {
  local method="$1" path="$2" body="${3:-}"
  if [[ -n "$body" ]]; then
    gh api \
      --method "$method" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "/repos/${OWNER}/${REPO}${path}" \
      --input - <<<"$body"
  else
    gh api \
      --method "$method" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "/repos/${OWNER}/${REPO}${path}"
  fi
}

main_body='{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Quality gate"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}'

develop_body='{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Quality gate"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}'

for branch in "${BRANCHES[@]}"; do
  body="$main_body"
  [[ "$branch" == "develop" ]] && body="$develop_body"
  echo "→ Applying protection to ${OWNER}/${REPO}@${branch}"
  api PUT "/branches/${branch}/protection" "$body" >/dev/null
done

echo "✔ Branch protection applied to main and develop."
