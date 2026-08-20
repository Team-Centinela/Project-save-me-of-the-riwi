# Quality Gate

Nothing reaches `main` or `develop` without the gate running green. The gate is the **same script** locally and in CI: `scripts/verify.sh`. That single fact — local and CI cannot diverge — is the point of the whole quality system.

---

## Gate order

The gate runs in this fixed order. A failure stops the script at the failing step.

```
1. format      — Prettier (pnpm format:check)
2. lint        — ESLint, zero warnings (pnpm lint)
3. types       — tsc --noEmit (pnpm check-types)
4. tests       — Vitest with coverage (pnpm test)        [full mode only]
5. build       — Production build (pnpm build)            [full mode only]
6. dependency  — Deprecated / outdated packages check    [full mode only]
```

Skipping a step or weakening it "to make it pass" is treated as a process failure, not a technical one.

---

## Modes

`verify.sh` takes one argument: `--quick` or `--full`.

| Mode       | Steps                                                | Used by                                | Target time |
| ---------- | ---------------------------------------------------- | -------------------------------------- | ----------- |
| `--quick`  | format → lint → types                                | `.husky/pre-commit`                    | < 10 s      |
| `--full`   | format → lint → types → tests → build → dependencies | `.husky/pre-push`, `.github/workflows/ci.yml` | < 90 s   |

If either mode grows beyond its budget, **fix the cause**, do not remove steps. A slow gate becomes `--no-verify` on a Friday night and then it stops being a gate.

---

## Local usage

```bash
# During the inner loop
bash scripts/verify.sh --quick

# Before pushing
bash scripts/verify.sh --full
```

You can also run individual steps on their own to see the full output:

```bash
pnpm format
pnpm lint
pnpm check-types
pnpm test
pnpm build
./scripts/check-versions.sh
```

---

## Husky hooks

Two hooks live in `.husky/`:

### `pre-commit`

1. `pnpm lint-staged` — runs ESLint `--fix` and Prettier on the staged files only.
2. `bash scripts/verify.sh --quick` — runs the full project through format, lint, types.

`lint-staged` fixes and formats **the files in this commit**; `verify.sh --quick` checks **the entire project**. They are different things and both are needed.

### `pre-push`

1. `bash scripts/verify.sh --full` — runs the entire gate.

### `commit-msg` (reserved)

A future enhancement is a `commit-msg` hook powered by `@commitlint/cli` to enforce the Conventional Commits format. Wiring this in requires the baseline scaffold (Husky is already initialized) and is tracked separately.

---

## CI

`.github/workflows/ci.yml` runs `bash scripts/verify.sh --full` on:

- every push to `main`
- every pull request targeting `main` or `develop`

The CI sets `VITE_TMDB_READ_TOKEN` from a repository secret (`Settings → Secrets and variables → Actions`). Branch protection on `main` and `develop` requires the resulting `gate` check to pass before a PR can be merged.

A green local `--full` plus a green CI `gate` check is the only mergeable state.

---

## Reading a failure

1. The script prints the step it failed on, in the format `[3/5] Tipos — tsc --noEmit`.
2. The failing command's output follows.
3. The script exits non-zero.
4. Re-run the failing step on its own to see the full output without the surrounding noise:

   ```bash
   # For a type failure
   pnpm check-types

   # For a lint failure
   pnpm lint

   # For a test failure with coverage report
   pnpm test
   ```

5. For a coverage failure, open `coverage/index.html` in a browser.
6. For a dependency deprecation, run `./scripts/check-versions.sh` (without `--gate`) and read the column that says `DEPRECADO`. Replace the package with its documented successor.

---

## Coverage

Coverage thresholds are deliberately left **commented out** until the domain layer is implemented:

```ts
// vitest.config.ts → test.coverage.thresholds
// thresholds: {
//   lines: 80, functions: 80, branches: 80, statements: 80,
//   'src/domain/**/*.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
// },
```

When they are uncommented:

- **Domain (`src/domain/**`): 100%** across all four metrics. The domain is pure TypeScript and cheap to test; if a domain file is hard to cover, the design is the problem.
- **Everything else: 80%** across all four metrics.

---

## What you must never do

- **Never `--no-verify`** to push around a failing commit or pre-push hook.
- **Never `--max-warnings N` for `N > 0`** in the ESLint config.
- **Never disable a rule with `// eslint-disable`** without a comment explaining why and a linked issue.
- **Never `// @ts-expect-error` or `// @ts-ignore`** without a comment explaining why.
- **Never widen a TypeScript flag** (turn off `noUncheckedIndexedAccess`, etc.) to make code pass.
- **Never edit `pnpm-lock.yaml` by hand.**

Each of those is a hole in the gate. The whole point of the gate is that holes are not allowed.
