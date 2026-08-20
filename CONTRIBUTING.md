# Contributing to Cineteca

Thanks for contributing. This document is the single source of truth for **how** work lands in this repository: branches, commits, pull requests, the quality gate, and the rules the architecture expects you to follow.

If you are looking for **what the project is** or **how to run it**, see the [README](./README.md). For depth on a specific topic — architecture, stack versions, the quality gate — see the [`docs/`](./docs) folder.

---

## Table of Contents

1. [Branching model](#branching-model)
2. [Commit and PR title convention](#commit-and-pr-title-convention)
3. [Pull request process](#pull-request-process)
4. [Quality gate](#quality-gate)
5. [Architecture rules](#architecture-rules)
6. [Local setup](#local-setup)
7. [Reporting bugs and requesting features](#reporting-bugs-and-requesting-features)
8. [References](#references)

---

## Branching model

The repo uses a lightweight Git Flow with two long-lived branches and a handful of short-lived topic branches.

### Long-lived branches

| Branch  | Purpose                                                              | Receives merges from         | Protection                                                                 |
| ------- | -------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `main`  | Production-ready code. Every commit on `main` is releasable.         | `release/*`, `hotfix/*`      | PR + 1 review + green CI + linear history + admins included                |
| `develop` | Integration branch for the next release. Features accumulate here. | `feature/*`, `bugfix/*`, `release/*`, `hotfix/*` | PR + 1 review + green CI + linear history                                  |

### Short-lived branches

| Prefix       | Branched from | Merged back into               | Naming                                       |
| ------------ | ------------- | ------------------------------ | -------------------------------------------- |
| `feature/`   | `develop`     | `develop`                      | `feature/<scope>-<short-desc>`               |
| `bugfix/`    | `develop`     | `develop`                      | `bugfix/<scope>-<short-desc>`                |
| `chore/`     | `develop`     | `develop`                      | `chore/<scope>-<short-desc>`                 |
| `release/`   | `develop`     | `main` **and** `develop`       | `release/vX.Y.Z`                             |
| `hotfix/`    | `main`        | `main` **and** `develop`       | `hotfix/<scope>-<short-desc>`                |

### Rules

1. **Branch names are lowercase, kebab-case, and start with one of the allowed prefixes.** A PR from a branch that does not match is sent back.
2. **`<scope>` is the affected layer or area.** Examples: `domain`, `infra`, `ui`, `docs`, `gate`, `cache`, `a11y`.
3. **`<short-desc>` is 2–4 words, imperative mood, no issue number.** Examples: `add-money-type`, `wire-lists-detail`, `fix-rate-limit-retry`.
4. **One concern per branch.** A branch that touches the domain layer and ships a UI redesign gets split.
5. **Delete the branch after merge** (handled automatically by the repo setting).
6. **Never commit directly to `main` or `develop`** — even admins use PRs.

### Examples

```text
feature/domain-add-money-type
feature/ui-movie-detail-expansion
bugfix/cache-stale-trending-on-filter-change
chore/docs-split-readme-and-contributing
chore/ci-add-codecov-badge
release/v0.1.0
hotfix/env-validation-crash-on-empty-token
```

---

## Commit and PR title convention

We follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/). Because the repo uses **squash-merge only** (see below), the **PR title is the commit message** that ends up on `develop` or `main`. Getting the PR title right is the entire commit-message practice here.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Allowed types

| Type       | Use when                                                     |
| ---------- | ------------------------------------------------------------ |
| `feat`     | A new user-visible feature                                   |
| `fix`      | A bug fix                                                    |
| `docs`     | Documentation-only changes                                   |
| `refactor` | A code change that neither fixes a bug nor adds a feature   |
| `perf`     | A code change that improves performance                      |
| `test`     | Adding or correcting tests                                   |
| `chore`    | Tooling, CI, dependencies, or other non-product changes     |
| `build`    | Changes to the build system or external dependencies         |
| `ci`       | Changes to CI configuration files and scripts                |
| `style`    | Formatting only (no logic change)                            |
| `revert`   | Reverts a previous commit                                    |

### Allowed scopes

Match the **layer or area** of the change. From the project architecture:

- `domain` — pure TypeScript, entities, policies, formatters
- `application` — use cases, ports
- `infra` or `infrastructure` — HTTP, storage, API adapters
- `ui` or `presentation` — React, routes, hooks, components
- `config` — env, build, Vite, Tailwind
- `gate` — quality gate scripts and CI
- `a11y` — accessibility-only changes
- `docs` — `docs/` folder and README
- `deps` — dependency bumps
- `release` — release prep

### Subject rules

- **Imperative mood, lowercase, no trailing period**: `add money type`, not `Added money type.` or `Adds money type.`
- **Max 72 characters** total for the first line.
- **Body wraps at 100 columns** and explains **why**, not what.
- **Footer** for breaking changes (`BREAKING CHANGE: ...`) and issue references (`Closes #42`, `Refs #15`).

### Examples

```
feat(domain): add Money type with Intl formatter

Parse amounts from TMDB as integers in the smallest currency unit.
Formatting is delegated to Intl.NumberFormat so locales work for free.

Closes #21
```

```
fix(cache): cancel in-flight trending query on filter change

Without cancellation, switching genres mid-flight triggered a
late-arriving response that overrode the new filter.

Refs #35
```

```
chore(docs): split README into README + CONTRIBUTING + docs/
```

```
feat(infra)!: switch HTTP client from fetch to axios

BREAKING CHANGE: replaces the native fetch wrapper. Existing
interceptors must be ported to axios interceptors.
```

---

## Pull request process

1. **Branch off the right base.** `feature/*`, `bugfix/*`, and `chore/*` branch off `develop`. `hotfix/*` branches off `main`. `release/*` branches off `develop`.
2. **Use the PR template.** It is enforced by `.github/pull_request_template.md`. PRs that arrive empty are sent back.
3. **Keep PRs focused.** One concern per branch (see rule 4 above). Large refactors ship in multiple PRs.
4. **Pass the gate locally before pushing.** Run `bash scripts/verify.sh --quick` for the inner loop, `bash scripts/verify.sh --full` before the push. See the [quality gate](#quality-gate) below.
5. **Open the PR against the correct base.**
   - `feature/*`, `bugfix/*`, `chore/*` → base is `develop`.
   - `hotfix/*` → base is `main`, then a backport PR from `main` to `develop`.
   - `release/*` → base is `main` (and a follow-up PR to `develop`).
6. **Reference the issues it closes.** Use `Closes #N`, `Fixes #N`, or `Refs #N` in the PR body.
7. **Request a review.** At least one approval is required to merge (see branch protection).
8. **Merge with squash.** Only "Squash and merge" is allowed. The PR title becomes the squash commit message. The head branch is deleted automatically after merge.
9. **Never use `--no-verify`.** A gate that can be skipped is not a gate.

---

## Quality gate

Nothing reaches `main` or `develop` without the gate running green. The gate has two modes, both implemented in `scripts/verify.sh`:

| Mode       | When                              | What it runs                                                                |
| ---------- | --------------------------------- | --------------------------------------------------------------------------- |
| `--quick`  | Pre-commit (Husky)                | format → lint → types                                                       |
| `--full`   | Pre-push (Husky) and CI           | format → lint → types → tests (with coverage) → build → dependency check    |

### Husky hooks

- **`.husky/pre-commit`** runs `pnpm lint-staged` and `bash scripts/verify.sh --quick`.
- **`.husky/pre-push`** runs `bash scripts/verify.sh --full`.

### CI

`.github/workflows/ci.yml` runs the **same** `verify.sh --full` script on every push to `main` and every pull request. Branch protection requires this `gate` check to pass before merge.

### Time budget

The quick gate targets **under 10 seconds**, the full gate **under 90 seconds**. If either grows beyond that, fix the cause; do not remove steps.

### Reading a failure

1. The output names the failing step (`[2/5] Linter — ESLint, cero advertencias`).
2. The script exits non-zero on the first failed step.
3. Re-run the failing step on its own (`pnpm lint`, `pnpm check-types`, `pnpm test`, `pnpm build`) to see the full output.
4. For dependency deprecations, run `./scripts/check-versions.sh` to see the report.

For the full reference, see [`docs/quality-gate.md`](./docs/quality-gate.md).

---

## Architecture rules

The codebase follows Clean Architecture with a strict **dependency rule**: dependencies point inward, and the domain layer is pure TypeScript.

| Layer              | May import                                | Must not import                              |
| ------------------ | ----------------------------------------- | -------------------------------------------- |
| `domain/`          | other `domain/` modules                   | React, Axios, TanStack Query, anything from `application/`, `infrastructure/`, `presentation/` |
| `application/`     | `domain/`                                 | React, Axios, `presentation/`, `infrastructure/` |
| `infrastructure/`  | `domain/`, `application/`, axios          | React, `presentation/`                       |
| `presentation/`    | everything below it                       | —                                            |
| `infrastructure/http/` | axios (only here)                    | anywhere else uses axios                      |

The linter enforces this rule in `eslint.config.js` — see the `no-restricted-imports` blocks. A file in `domain/` that imports `react` fails lint, locally and in CI.

For the full layer map, decision table, and conventions (states as discriminated unions, money as integers, three untrusted edges), see [`docs/architecture.md`](./docs/architecture.md).

---

## Local setup

```bash
# 1. Clone
git clone https://github.com/Team-Centinela/Project-save-me-of-the-riwi.git
cd Project-save-me-of-the-riwi

# 2. Install dependencies
corepack enable     # so pnpm version matches package.json
pnpm install

# 3. Configure the environment
cp .env.example .env.local
# Edit .env.local and set VITE_TMDB_READ_TOKEN to your TMDB Read Access Token.
# The token is bundled into the client; use a practice account that can be
# rotated in one minute from the TMDB API panel.

# 4. Start the dev server
pnpm dev            # http://localhost:5173

# 5. Run the gate
bash scripts/verify.sh --quick
```

Editor: install the **ESLint**, **Prettier**, and **Tailwind CSS IntelliSense** extensions. Turn on "format on save" pointing at Prettier.

---

## Reporting bugs and requesting features

- **Bug?** Use the [Bug Report](../../issues/new?template=bug_report.yml) template.
- **Feature?** Use the [Feature Request](../../issues/new?template=feature_request.yml) template.
- **Refactor, tooling, or docs?** Use the [Chore / Tech Debt](../../issues/new?template=chore.yml) template.
- **Security issue?** Email the maintainers privately — do not open a public issue.

Before opening, search the existing issues to avoid duplicates. For bugs, reproduce on the latest `main` first.

---

## References

- **Project guide (what we build and why):** [Cineteca project guide](https://gist.github.com/xXAreizaXx/16cb8c169ab015adb0be35fac4992863)
- **Technical baseline (the scaffold that produced this repo):** [Cinética BaseLine](https://gist.github.com/xXAreizaXx/8566c4410fe16fab5864abb72ae55e4a)

> _This product uses the API of TMDB but is not endorsed or certified by TMDB._
