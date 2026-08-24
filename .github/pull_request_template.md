# Pull Request

<!--
Thanks for your contribution! Please fill out the sections below so reviewers have everything they need.
A PR that doesn't follow the template will be sent back to be completed.
-->

## Description

<!-- What does this PR do? Why is it needed? Link to the issue it closes. -->

Closes #

## Type of Change

<!-- Check all that apply. -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Refactor (no functional change, just code improvement)
- [ ] Chore / Maintenance (dependency upgrade, tooling, docs)
- [ ] Performance improvement
- [ ] Test only

## Branch Naming

<!-- Match the convention in CONTRIBUTING.md. PRs from branches that do not match are sent back. -->

- [ ] My branch starts with `feature/`, `bugfix/`, `chore/`, `release/`, or `hotfix/`
- [ ] My branch name is lowercase, kebab-case, and follows `<prefix>/<scope>-<short-desc>` (no issue number in the name)
- [ ] I branched off `develop` (or off `main` for `hotfix/` and `release/`)

## What Changed

<!-- A short bullet list of the actual changes. Group by component or file. -->

- _[Component/file]_ — short description
- _[Component/file]_ — short description

## Affected Layers

<!-- Match the architecture in the project guide. Dependencies must point inward. -->

- [ ] `domain/` — pure TypeScript, no framework imports
- [ ] `application/` — use cases and ports
- [ ] `infrastructure/` — HTTP, storage, API
- [ ] `presentation/` — React, routes, hooks

## Screenshots / Recordings

<!-- Required for any UI change. Before/after is best. -->

### Before

<!-- Screenshot, or N/A -->

### After

<!-- Screenshot, or N/A -->

## How to Test

<!-- Step-by-step so a reviewer can verify in under 5 minutes. -->

1. Pull the branch
2. Run `pnpm install`
3. Run `pnpm dev` and visit `...`
4. Verify that...

## Tests

- [ ] I added unit tests for the new logic
- [ ] I updated existing tests that no longer apply
- [ ] I verified the manual test plan above
- [ ] Coverage has not decreased

## Quality Gate

<!-- Run `bash scripts/verify.sh --full` and confirm every step is green. -->

- [ ] `pnpm format:check` passes
- [ ] `pnpm lint` passes (zero warnings)
- [ ] `pnpm check-types` passes
- [ ] `pnpm test` passes (coverage thresholds met)
- [ ] `pnpm build` succeeds
- [ ] `./scripts/check-versions.sh` reports no deprecated deps

## Checklist

- [ ] My code follows the project's architecture rules (domain is pure, dependencies point inward)
- [ ] I have used the codebase's existing patterns and utilities
- [ ] I have not introduced `any` without justification
- [ ] I have not used `--no-verify` or weakened the gate
- [ ] I have added comments only where the logic is non-obvious
- [ ] I have updated the documentation (README, copy, etc.) if needed
- [ ] I have read the [Cineteca Project Guide](https://github.com/Team-Centinela/Project-save-me-of-the-riwi/blob/main/Cineteca.md) and the [Baseline Guide](https://github.com/Team-Centinela/Project-save-me-of-the-riwi/blob/main/Cin%C3%A9tica%20BaseLine.md)

## Deployment Notes

<!-- Anything reviewers or deployers should know: env vars, migrations, breaking changes, config toggles. -->

- _None / describe here_

## Reviewer Focus

<!-- Optional: call out specific files or decisions you want extra attention on. -->

- @reviewer please look at `src/...`

---

> By submitting this pull request, I confirm that my contribution is made under the project's license and that I have the right to submit it.