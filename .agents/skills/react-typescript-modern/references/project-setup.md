# Project setup and architecture in Cineteca

This file describes the scaffold and the architecture the linter enforces, calibrated to what is actually pinned in `package.json` and [`docs/architecture.md`](../../../docs/architecture.md). For the step-by-step baseline that produced this repo, see the [Baseline Guide](https://gist.github.com/xXAreizaXx/8566c4410fe16fab5864abb72ae55e4a); for product-level context, see the [Project Guide](https://gist.github.com/xXAreizaXx/16cb8c169ab015adb0be35fac4992863). If the local copy and the upstream gist ever diverge, the gist is canonical.

## The toolchain at a glance

- **Build:** Vite 8.2.x — `vite.config.ts` has `@vitejs/plugin-react`, `@tailwindcss/vite`, and `vite-tsconfig-paths`.
- **Language:** TypeScript **6.0.x (not 7)** — see "Why TypeScript 6, not 7" below.
- **UI:** React 19.2.x.
- **Routing:** React Router 8.3.x — everything imported from `react-router`, browser entry points from `react-router/dom`.
- **Server state:** TanStack Query 5.101.x, devtools mounted in development.
- **HTTP:** Axios 1.19.x — single instance, restricted to `src/infrastructure/http/**` by ESLint.
- **Validation:** Zod 4.4.x — schemas are the types; validates network, storage, URL, forms.
- **Forms:** React Hook Form 7.85.x + `@hookform/resolvers` 5.9.x (resolvers must be 5+ to talk to Zod 4).
- **Styles:** Tailwind CSS 4.3.x — CSS-first; design tokens in `@theme {}` inside `src/index.css`. No `tailwind.config.js`.
- **Testing:** Vitest 4.1.x + Testing Library 16.3.x + MSW 2.15.x + axe-core 4.13.x. `jsdom` for the DOM. `onUnhandledRequest: 'error'` in MSW is the feature, not a bug.
- **Quality:** ESLint 10.8.x + `typescript-eslint` 8.67.x + Prettier 3.9.x. `--max-warnings 0` everywhere. A warning nobody fixes multiplies until the linter stops reporting — one warning is a failure.
- **Gate:** Husky 9.1.x + `lint-staged` 17.3.x + `scripts/verify.sh`. The CI workflow runs the same `verify.sh --full`; local and CI cannot diverge.
- **Package manager:** pnpm 11.22.x, pinned via `packageManager` in `package.json`.

## Why TypeScript 6, not 7

`typescript-eslint@8.67.0` declares `typescript >=4.8.4 <6.1.0` as a peer dependency. With TypeScript 7, the linter with type-aware rules stops working — and that linter is what enforces the architecture (see the `no-restricted-imports` blocks in `eslint.config.js`).

Renouncing the linter to run the newest compiler is a bad trade. The compiler stays on the line the linter supports, and a `TODO(upgrade): subir a TypeScript 7 cuando typescript-eslint admita >=7 en peerDependencies` comment lives next to the version pin. Until that comment is acted on, do not bump `typescript` past `~6.0.2`.

## The four-layer architecture and what each layer may import

This is enforced by ESLint, not by convention. A file in `domain/` that imports `react` fails lint, locally and in CI.

| Layer                  | May import                       | Must not import                                                                                |
| ---------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `domain/`              | other `domain/` modules          | React, Axios, TanStack Query, anything from `application/`, `infrastructure/`, `presentation/` |
| `application/`         | `domain/`                        | React, Axios, `presentation/`, `infrastructure/`                                               |
| `infrastructure/`      | `domain/`, `application/`, axios | React, `presentation/`                                                                         |
| `presentation/`        | everything below it              | —                                                                                              |
| `infrastructure/http/` | axios (only here)                | anywhere else uses axios                                                                       |

Pocket rule: if a file in `domain/` would need to install something to work, it is in the wrong folder.

### The 60-second demonstration

```bash
mkdir -p src/domain/shared
echo "import { useState } from 'react'; export const x = useState;" > src/domain/shared/bad.ts
pnpm lint    # must FAIL: "El dominio no depende de frameworks"
rm src/domain/shared/bad.ts
pnpm lint    # must pass
```

Do this once when onboarding, not in production. A rule that only lives in a diagram breaks on day 4; one that lives in the linter and in CI does not.

## Folder layout

```
src/
  domain/
    shared/                 # cross-resource policies, formatters, error types
  application/
    ports/                  # interfaces ("something that fetches movies")
  infrastructure/
    http/                   # the axios instance and interceptors (axios only here)
    api/
      <resource>/           # one folder per TMDB resource: call + Zod validation + key factory
    storage/                # localStorage adapter for the user's library
  presentation/
    routes/                 # route definitions and layouts
    components/
      ui/                   # presentational primitives
      feature/              # composed, screen-shaped components
    hooks/                  # data hooks that wrap useQuery / useSuspenseQuery / useMutation
    providers/              # QueryClientProvider, ErrorBoundary, etc.
    copy/                   # user-visible strings (Spanish)
    lib/                    # cn(), other presentational helpers
  config/
    env.ts                  # Zod-validated env, parsed once at startup
  test/
    msw/                    # MSW handlers, one file per resource
```

## What goes where (pocket table)

| You are writing                                 | Folder                           |
| ----------------------------------------------- | -------------------------------- |
| A business rule, a state, a formatter           | `domain/`                        |
| The interface of "something that brings movies" | `application/ports/`             |
| The HTTP call + Zod validation                  | `infrastructure/api/<resource>/` |
| The HTTP client itself                          | `infrastructure/http/`           |
| Access to the browser's storage                 | `infrastructure/storage/`        |
| A data hook, a component, a route               | `presentation/`                  |
| A string the user sees                          | `presentation/copy/`             |

## tsconfig

`tsconfig.app.json` enables strict mode plus the flags that catch the most real bugs in this project. Pin them explicitly rather than relying on compiler defaults that could shift:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
  },
}
```

| Flag                                    | What it prevents                                                                                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `noUncheckedIndexedAccess`              | Reading the first element of an empty list — the compiler forces you to decide what happens when there is nothing. The single flag that catches the most real bugs in this project. |
| `exactOptionalPropertyTypes`            | A property optional accepts "undefined" explicitly. When building filters that difference decides whether a cache key changes.                                                      |
| `noFallthroughCasesInSwitch`            | A case without a break slipping into the next.                                                                                                                                      |
| `verbatimModuleSyntax`                  | Type-only imports survive the build — must be marked with `import type`.                                                                                                            |
| `noUnusedLocals` / `noUnusedParameters` | Dead code accumulating during a week of hurry.                                                                                                                                      |

`moduleResolution: "bundler"` matches how Vite resolves modules. TypeScript handles the `@/` alias, but the bundler needs to be told too — that is what `vite-tsconfig-paths` in `vite.config.ts` does.

## Tailwind — CSS-first, no config file

There is no `tailwind.config.js`. The tokens live in `@theme {}` inside `src/index.css`:

- **Literal color values live only in `@theme`.** A color written by hand inside a component is a leak from the design contract.
- **Names are semantic.** `bg-status-unreleased` communicates intent; `bg-amber-500` communicates only a color.
- **Classes are composed with a utility, never by string concatenation.** `src/presentation/lib/cn.ts` combines `clsx` with `tailwind-merge` and exports `cn`. Two lines that prevent the silent bug of two paddings in the same `className`.

## Validation — Zod at every untrusted edge

There are three untrusted edges in this app, and each is validated the same way:

1. **The network.** Every TMDB response passes through a Zod schema in `src/infrastructure/api/<resource>/`. The schema produces a domain entity, not a raw API object. An unhandled field is a build/lint problem, not a runtime surprise.
2. **The URL.** Filter values from `useSearchParams` and route loaders are parsed with the same Zod schema that validates the response. An absurd value typed by hand falls back to defaults with a clear empty state, never to a crashed screen.
3. **The browser's storage.** Reads from `localStorage` go through a Zod schema before anything downstream sees them. A corrupted entry is discarded, not propagated.

The schema **is** the type. Define it once, infer the type with `z.infer<typeof schema>`, validate at the edge, and the rest of the code treats the type as the source of truth.

## Testing — what to write and how

- **Domain (`src/domain/**`):** unit tests, 100% coverage. The domain is pure TypeScript, so tests are cheap and fast. If a domain file is hard to test, the design is wrong.
- **Infrastructure (`src/infrastructure/**`):** unit tests with the HTTP client mocked via MSW. The Zod schema's success and failure paths are both covered.
- **Presentation (`src/presentation/**`):** component tests with `@testing-library/react`, querying by accessible role and name. Network calls are intercepted by MSW with `onUnhandledRequest: 'error'` — a request that nobody simulated is a test failure, not a silent skip.
- **Accessibility:** `axe-core` is wired in directly (no wrapper package — the wrappers are unmaintained; the wrapper is twelve lines).

Coverage thresholds: 100% on `src/domain/**`, 80% global. Both are enforced by the gate.

## Quality gate — the only path to `main`

Nothing reaches `main` without `scripts/verify.sh --full` running green. The same script runs in pre-commit (`--quick`: format → lint → types), pre-push (`--full`: format → lint → types → tests → build → dependency check), and CI (`--full`).

Time budget: `--quick` under 10 s, `--full` under 90 s. If either grows beyond that, fix the cause; do not remove steps. A gate that can be skipped is not a gate — `--no-verify` is not in the vocabulary.

For the full reference, see [`docs/quality-gate.md`](../../../docs/quality-gate.md).

## Intentionally excluded

The following are deliberately **not** in the stack — do not reach for them in new code:

- **Redux, Zustand, Jotai, MobX.** Server state is in the Query cache; view state is in the URL; the library is its own validated module under `src/infrastructure/storage/`. If you reach the end of a feature needing a global store, the model is wrong somewhere — that conversation is part of the project.
- **A custom backend or proxy.** Out of scope. The TMDB token ships in the bundle and the trade-off is documented in the README.
- **Service workers for offline persistence.** The localStorage adapter handles current-session persistence; an offline mode with SW is explicitly out of scope.
- **CSS-in-JS libraries.** Tailwind 4's CSS-first design tokens are the source of truth; a runtime CSS layer would duplicate the design contract.
- **`forwardRef` in new components.** React 19 made `ref` a regular prop — see `references/react-fundamentals.md`.
