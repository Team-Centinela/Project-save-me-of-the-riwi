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
# Issue #27.

set -euo pipefail

OWNER="${OWNER:-Team-Centinela}"
REPO="${REPO:-Project-save-me-of-the-riwi}"
BRANCHES=("main" "develop")

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN is required (admin scope)." >&2
  exit 2
fi

# Expected state per branch, used for the post-apply verification.
# Keep these in sync with the table in CONTRIBUTING.md.
#
# Note: contexts is checked even though it is identical on both
# branches — the round-1 review caught a `gate` vs `Quality gate`
# typo in exactly this field, so excluding it on a "differs per
# branch" filter would re-introduce the silent-failure mode the
# whole verification step exists to catch.
declare -A EXPECT_ENFORCE_ADMINS=(
  ["main"]="true"
  ["develop"]="false"
)
declare -A EXPECT_LINEAR=(
  ["main"]="false"
  ["develop"]="false"
)
declare -A EXPECT_CONTEXTS=(
  ["main"]="Quality gate"
  ["develop"]="Quality gate"
)

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

verify() {
  local branch="$1" got got_admins got_linear got_contexts
  got=$(api GET "/branches/${branch}/protection")
  got_admins=$(printf '%s' "$got" | jq -r '.enforce_admins.enabled')
  got_linear=$(printf '%s' "$got" | jq -r '.required_linear_history.enabled')
  got_contexts=$(printf '%s' "$got" | jq -r '.required_status_checks.contexts | join(",")')
  if [[ "$got_admins" != "${EXPECT_ENFORCE_ADMINS[$branch]}" ]]; then
    echo "� ${branch}: enforce_admins expected '${EXPECT_ENFORCE_ADMINS[$branch]}', got '${got_admins}'" >&2
    return 1
  fi
  if [[ "$got_linear" != "${EXPECT_LINEAR[$branch]}" ]]; then
    echo "✘ ${branch}: required_linear_history expected '${EXPECT_LINEAR[$branch]}', got '${got_linear}'" >&2
    return 1
  fi
  if [[ "$got_contexts" != "${EXPECT_CONTEXTS[$branch]}" ]]; then
    echo "✘ ${branch}: required contexts expected '${EXPECT_CONTEXTS[$branch]}', got '${got_contexts}'" >&2
    return 1
  fi
  echo "  ✓ ${branch}: enforce_admins=${got_admins}, required_linear_history=${got_linear}, required_contexts=${got_contexts}"
}

for branch in "${BRANCHES[@]}"; do
  body="$main_body"
  [[ "$branch" == "develop" ]] && body="$develop_body"
  echo "→ Applying protection to ${OWNER}/${REPO}@${branch}"
  api PUT "/branches/${branch}/protection" "$body" >/dev/null
  verify "$branch"
done

echo "✔ Branch protection applied and verified on main and develop."
