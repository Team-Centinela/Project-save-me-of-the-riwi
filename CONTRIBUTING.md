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

| Branch    | Purpose                                                            | Receives merges from                             | Protection                                 |
| --------- | ------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------ |
| `main`    | Production-ready code. Every commit on `main` is releasable.       | `release/*`, `hotfix/*`                          | PR + 1 review + green CI + admins included |
| `develop` | Integration branch for the next release. Features accumulate here. | `feature/*`, `bugfix/*`, `release/*`, `hotfix/*` | PR + 1 review + green CI                   |

### Short-lived branches

| Prefix     | Branched from | Merged back into         | Naming                         | Merge strategy               |
| ---------- | ------------- | ------------------------ | ------------------------------ | ---------------------------- |
| `feature/` | `develop`     | `develop`                | `feature/<scope>-<short-desc>` | **Squash**                   |
| `bugfix/`  | `develop`     | `develop`                | `bugfix/<scope>-<short-desc>`  | **Squash**                   |
| `chore/`   | `develop`     | `develop`                | `chore/<scope>-<short-desc>`   | **Squash**                   |
| `release/` | `develop`     | `main` **and** `develop` | `release/vX.Y.Z`               | **Merge commit** (`--no-ff`) |
| `hotfix/`  | `main`        | `main` **and** `develop` | `hotfix/<scope>-<short-desc>`  | **Merge commit** (`--no-ff`) |

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

## Merge strategy — hybrid, on purpose

The repo uses a **hybrid** strategy. Not everything squashes, and not everything merges with a real commit. The choice depends on whether the source branch will need to exchange changes with the target again.

### The rule

| Merge direction         | Strategy                     | Why                                                                                                                          |
| ----------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `feature/*` → `develop` | **Squash**                   | Throwaway branch; nothing will ever merge back into it                                                                       |
| `bugfix/*` → `develop`  | **Squash**                   | Same                                                                                                                         |
| `chore/*` → `develop`   | **Squash**                   | Same                                                                                                                         |
| `release/*` → `main`    | **Merge commit** (`--no-ff`) | `release/*` is the bridge between `develop` and `main`; both branches need a real shared parent to keep round-tripping clean |
| `release/*` → `develop` | **Merge commit** (`--no-ff`) | Same                                                                                                                         |
| `hotfix/*` → `main`     | **Merge commit** (`--no-ff`) | Same                                                                                                                         |
| `hotfix/*` → `develop`  | **Merge commit** (`--no-ff`) | Same                                                                                                                         |

### Why not squash everything?

Squash-merge creates a **brand-new commit** on the target branch with only the target's HEAD as its parent — the source branch's history is collapsed into a single fresh commit. That is fine when the source branch is throwaway. It is **not** fine when the source branch and the target are two long-lived branches that need to keep exchanging changes.

The concrete failure mode:

1. `release/v0.1` is squash-merged into `main` → `main` has a synthetic `S1` commit whose parent is `main`'s previous HEAD.
2. `release/v0.1` is squash-merged into `develop` → `develop` has a synthetic `S2` commit whose parent is `develop`'s previous HEAD. `S2` and `S1` carry the same diff but are unrelated commit objects.
3. `main` later receives a hotfix `H`.
4. We try to merge `main` back into `develop`. Git's merge base between `main` and `develop` is the common ancestor from before `release/v0.1`, so the synthetic `S2` is treated as exclusive work on `develop` that `main` does not have. In practice this manifests one of two ways depending on the configuration: `fatal: refusing to merge unrelated histories` (if `--allow-unrelated-histories` is not set), or a long cascade of **phantom conflicts** as Git tries to re-apply the entire `S2` diff — even though every line of it is already in `main` as `S1`.

The fix is to use **real merge commits** (`--no-ff`) wherever two long-lived branches cross. A real merge commit has two parents, which keeps the shared ancestry intact for every future round-trip.

### Why the `main` history still looks clean

```bash
git log --first-parent main
```

shows only the merge commits on `main` — one line per release. The granular feature commits are still in the object graph (so `git bisect` and archaeology still work) but they don't clutter the high-level log. GitHub's PR diff view for a merge commit shows the same cumulative diff it would show for a squash, so reviewability is the same.

### Repo settings this requires

In **Settings → General → Pull Requests**:

| Setting                            | Value        |
| ---------------------------------- | ------------ |
| Allow squash merging               | enabled      |
| Allow merge commits                | **enabled**  |
| Allow rebase merging               | **disabled** |
| Allow auto-merge                   | **enabled**  |
| Automatically delete head branches | **enabled**  |
| Default squash commit title        | PR title     |
| Default squash commit message      | PR body      |

In **Settings → Branches → Branch protection** on `main` **and** `develop`:

| Setting                                      | `main`       | `develop`    |
| -------------------------------------------- | ------------ | ------------ |
| Require a pull request before merging        | **enabled**  | **enabled**  |
| Required approvals                           | 1            | 1            |
| Dismiss stale pull request approvals         | **enabled**  | **enabled**  |
| Require status checks to pass before merging | **enabled**  | **enabled**  |
| Required check                               | `gate` (CI)  | `gate` (CI)  |
| Require branches to be up to date            | **enabled**  | **enabled**  |
| Require conversation resolution              | **enabled**  | **enabled**  |
| Require linear history                       | **disabled** | **disabled** |
| Allow force pushes                           | disabled     | disabled     |
| Allow deletions                              | disabled     | disabled     |
| Include administrators                       | **enabled**  | disabled     |
| Allow auto-merge                             | **enabled**  | **enabled**  |

> "Require linear history" literally forbids merge commits and would force you right back into the squash-only problem. It is deliberately off on both long-lived branches.
>
> "Include administrators" is **on** for `main` so the gate is the gate even for repo owners; it is **off** for `develop` so admins can fast-forward the integration branch while iterating on the next release.

The full rationale and how each rule maps to the assignment gate ("nada entra a `main` sin el gate") lives in [issue #27](https://github.com/Team-Centinela/Project-save-me-of-the-riwi/issues/27).

The full rationale — including the per-branch ruleset, the `Include administrators` asymmetry, and how this maps to the assignment gate ("nada entra a `main` sin el gate") — is in [issue #27](https://github.com/Team-Centinela/Project-save-me-of-the-riwi/issues/27). The hybrid strategy itself is in [issue #29](https://github.com/Team-Centinela/Project-save-me-of-the-riwi/issues/29).

### How to choose the merge button for each PR

- **`feature/*`, `bugfix/*`, `chore/*` → `develop`:** click **Squash and merge**.
- **`release/*` → `main` and `release/*` → `develop`:** click **Create a merge commit**.
- **`hotfix/*` → `main` and `hotfix/*` → `develop`:** click **Create a merge commit**.

When squash is used, the PR title becomes the commit message — see the convention in the next section. When a merge commit is used, the PR title becomes the merge commit's subject line; follow the same convention so `git log` on `main` stays meaningful.

### Why Dependabot targets `develop`, not `main`

Most of the `main → develop` traffic in a typical repo is Dependabot opening dep-update PRs against `main`. That traffic is what forces the painful reverse sync in the first place. Pointing Dependabot at `develop` (see `.github/dependabot.yml`) eliminates the round-trip entirely for the common case. The only legitimate `main → develop` merge left is a true emergency hotfix committed straight to `main`, which is rare and handled with a `--no-ff` merge commit just like the others.

---

## Commit and PR title convention

We follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/). For **squash** merges (feature / bugfix / chore → develop), the PR title is the commit message that ends up on `develop`. For **merge-commit** merges (release/* and hotfix/* into main/develop), the PR title becomes the merge commit's subject line. Either way, getting the PR title right is the entire commit-message practice here.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Allowed types

| Type       | Use when                                                  |
| ---------- | --------------------------------------------------------- |
| `feat`     | A new user-visible feature                                |
| `fix`      | A bug fix                                                 |
| `docs`     | Documentation-only changes                                |
| `refactor` | A code change that neither fixes a bug nor adds a feature |
| `perf`     | A code change that improves performance                   |
| `test`     | Adding or correcting tests                                |
| `chore`    | Tooling, CI, dependencies, or other non-product changes   |
| `build`    | Changes to the build system or external dependencies      |
| `ci`       | Changes to CI configuration files and scripts             |
| `style`    | Formatting only (no logic change)                         |
| `revert`   | Reverts a previous commit                                 |

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
   - `release/*` → base is `main` for the release PR, then a second PR from `release/*` back to `develop`.
   - `hotfix/*` → base is `main`, then a second PR from `hotfix/*` to `develop` (or from `main` to `develop` once the hotfix lands).
6. **Reference the issues it closes.** Use `Closes #N`, `Fixes #N`, or `Refs #N` in the PR body.
7. **Request a review.** At least one approval is required to merge (see branch protection).
8. **Pick the merge button correctly.** See the [merge strategy](#merge-strategy--hybrid-on-purpose) table above. The PR title is the squash / merge-commit subject line, so follow the convention in the next section.
9. **Never use `--no-verify`.** A gate that can be skipped is not a gate.

---

## Quality gate

Nothing reaches `main` or `develop` without the gate running green. The gate has two modes, both implemented in `scripts/verify.sh`:

| Mode      | When                    | What it runs                                                             |
| --------- | ----------------------- | ------------------------------------------------------------------------ |
| `--quick` | Pre-commit (Husky)      | format → lint → types                                                    |
| `--full`  | Pre-push (Husky) and CI | format → lint → types → tests (with coverage) → build → dependency check |

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

| Layer                  | May import                       | Must not import                                                                                |
| ---------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `domain/`              | other `domain/` modules          | React, Axios, TanStack Query, anything from `application/`, `infrastructure/`, `presentation/` |
| `application/`         | `domain/`                        | React, Axios, `presentation/`, `infrastructure/`                                               |
| `infrastructure/`      | `domain/`, `application/`, axios | React, `presentation/`                                                                         |
| `presentation/`        | everything below it              | —                                                                                              |
| `infrastructure/http/` | axios (only here)                | anywhere else uses axios                                                                       |

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

The full project and baseline guides are mirrored inside this repo so they are always reachable:

- **Project guide** (what we build and why) — [`docs/guides/project-guide.md`](./docs/guides/project-guide.md) · [upstream gist](https://gist.github.com/xXAreizaXx/16cb8c169ab015adb0be35fac4992863)
- **Technical baseline** (the scaffold that produced this repo) — [`docs/guides/baseline.md`](./docs/guides/baseline.md) · [upstream gist](https://gist.github.com/xXAreizaXx/8566c4410fe16fab5864abb72ae55e4a)

If a local copy and the upstream gist ever diverge, the gist is canonical.

### Agent skills

AI agents contributing to this repository **must** load the [`react-typescript-modern`](./.agents/skills/react-typescript-modern/SKILL.md) skill before writing, reviewing, or refactoring any React or TypeScript code. The skill is calibrated to the versions pinned in `package.json` and to the layered architecture the linter enforces, and exists to prevent stale patterns from training data (class components, `PropTypes`, `react-router-dom`, query-level `onSuccess`, hand-rolled `useEffect` fetches) from leaking into new code.

- **Skill index** — [`.agents/skills/react-typescript-modern/SKILL.md`](./.agents/skills/react-typescript-modern/SKILL.md)
- **Reference: React fundamentals** — [`.agents/skills/react-typescript-modern/references/react-fundamentals.md`](./.agents/skills/react-typescript-modern/references/react-fundamentals.md)
- **Reference: Data fetching (TanStack Query)** — [`.agents/skills/react-typescript-modern/references/data-fetching-react-query.md`](./.agents/skills/react-typescript-modern/references/data-fetching-react-query.md)
- **Reference: Routing (React Router)** — [`.agents/skills/react-typescript-modern/references/routing-react-router.md`](./.agents/skills/react-typescript-modern/references/routing-react-router.md)
- **Reference: Project setup & architecture** — [`.agents/skills/react-typescript-modern/references/project-setup.md`](./.agents/skills/react-typescript-modern/references/project-setup.md)

The general-purpose skill folder at `.agents/skills/` is the home for any agent-facing guidance in this repository. New skills should follow the same layout (`SKILL.md` at the root, optional `references/` for drill-down material) and be added here.

> _This product uses the API of TMDB but is not endorsed or certified by TMDB._
