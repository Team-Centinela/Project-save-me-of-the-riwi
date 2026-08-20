# Tech Stack

The versioned stack that Cineteca runs on, with the rationale for each choice. Versions are verified against the npm registry at the time of writing — re-check before upgrading, because a version table is a snapshot and the registry is the truth. Always use the latest stable release that the rest of the ecosystem supports; never `beta`, `rc`, `canary`, or `next`.

---

## Stack overview

| Layer            | Tool                                                  | Used for                                              |
| ---------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Build            | **Vite**                                              | Dev server, HMR, production build                    |
| Language         | **TypeScript** (strict)                               | Static types across the codebase                      |
| UI               | **React**                                             | Component model                                       |
| Routing          | **React Router**                                      | Nested routes, URL-as-state, route-level code splitting |
| Styles           | **Tailwind CSS**                                      | Utility-first CSS with design tokens in the CSS file |
| Variant utilities | **cva** + **tailwind-merge** + **clsx**              | Typed variants, conflict-free class composition      |
| Server state     | **TanStack Query**                                    | Cache, revalidation, infinite pagination, mutations   |
| HTTP             | **Axios**                                             | One instance, interceptors, cancellation             |
| Validation       | **Zod**                                               | Schemas as types — network, storage, URL, forms      |
| Forms            | **React Hook Form** + **`@hookform/resolvers`**       | Minimal re-renders; Zod schema validates and types    |
| Virtualization   | **`@tanstack/react-virtual`**                         | Constant memory with thousands of cards               |
| Icons            | **lucide-react**                                      | Tree-shakable, selectively imported icons             |
| UI error boundary| **react-error-boundary**                              | A render error cannot blank the screen               |
| Testing          | **Vitest** + **Testing Library** + **MSW** + **axe-core** | Unit, component, network, accessibility tests     |
| Quality          | **ESLint** + **typescript-eslint** + **Prettier**     | Linting, type-aware rules, formatting                 |
| Gate             | **Husky** + **lint-staged** + `scripts/verify.sh`     | Quality gate on every commit and push                 |
| Package manager  | **pnpm**                                              | Fast, deterministic installs                         |

---

## Why each tool

### Build — Vite

Vite gives near-instant dev startup and real HMR (state-preserving), and produces an optimized build with no extra configuration. The plugin model covers React, TypeScript path aliases, Tailwind, and Vitest config alignment without ad-hoc plumbing.

### Language — TypeScript, strict

Strict mode plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`. These flags catch real bugs:

- `noUncheckedIndexedAccess` makes an access on an empty list typed as "the element **or** undefined", forcing the caller to decide. The single flag that catches the most real bugs in this project.
- `exactOptionalPropertyTypes` makes the difference between "missing key" and "explicitly undefined" matter at the type level. That difference decides whether a cache key changes.

`typescript-eslint` is the consumer of these flags — it must remain compatible with them, which is why TypeScript itself stays at a version the linter supports.

### UI — React

React for the component model and the ecosystem. Nothing exotic — function components, hooks, error boundaries, strict mode enabled from day one.

### Routing — React Router

Nested routes, URL-as-state, route-level code splitting, loaders, and a clean separation between route configuration and the components it renders.

> Note: React Router 8 is imported from `react-router`, not `react-router-dom`. The `react-router-dom` package is the v7 line. Tutorials that use `react-router-dom` are about the previous major.

### Styles — Tailwind CSS

Tailwind 4 is CSS-first: there is no `tailwind.config.js` file, the design tokens live in `@theme {}` inside `src/index.css`. Three rules follow from this:

1. **Literal color values live only in `@theme`.** A color written by hand inside a component is a leak from the design contract.
2. **Names are semantic.** `bg-status-unreleased` communicates intent; `bg-amber-500` communicates only a color.
3. **Classes are composed with a utility, never by string concatenation.** `src/presentation/lib/cn.ts` combines `clsx` and `tailwind-merge` and exports `cn` — two lines that prevent the silent bug of two paddings in one className.

### Variant utilities — cva + tailwind-merge + clsx

- `cva` (class-variance-authority) for typed variants of a component.
- `clsx` for conditional class composition.
- `tailwind-merge` to resolve conflicting Tailwind classes deterministically.

### Server state — TanStack Query

Cache, background revalidation, infinite pagination, optimistic mutations, query cancellation, and devtools. Keys are hierarchical and filters are normalized so that two equivalent filter sets hit the same cache entry.

The Query devtools are mounted in development. Seeing the cache live saves a day of debugging later.

### HTTP — Axios

A single instance, interceptors for auth, interceptors for error normalization (TMDB's own status codes do not match HTTP status codes), and request cancellation. Lives in exactly one directory tree: `src/infrastructure/http/**`. The linter rejects `axios` imports anywhere else.

### Validation — Zod

The schema **is** the type. Validates network responses, localStorage reads, URL filters, and forms. `@hookform/resolvers` 5+ is required to talk to Zod 4; older resolvers fail with a type error that is hard to diagnose.

### Forms — React Hook Form + resolvers

Minimal re-renders. The same Zod schema that validates a server response validates the form, so types and validation rules are defined once.

### Virtualization — `@tanstack/react-virtual`

Constant memory with thousands of cards. Combined with smaller poster sizes for the grid, scrolling stays smooth and the layout does not shift.

### Icons — `lucide-react`

Tree-shakable. Icon files import only the icons they use.

### UI error boundary — `react-error-boundary`

A render error never blanks the screen. In development the fallback shows the message; in production it shows the empty state and a retry button.

### Testing — Vitest + Testing Library + MSW + axe-core

- **Vitest** as the test runner, with `jsdom` for the DOM.
- **Testing Library** for component tests by accessible role and name (not by class or test id).
- **MSW** to simulate the network at the boundary. `onUnhandledRequest: 'error'` is the feature, not a bug — a request without a handler fails the test instead of leaking to the real network.
- **axe-core** directly (no thin wrapper) for accessibility assertions. The wrapper packages are unmaintained; the wrapper is twelve lines.

### Quality — ESLint + typescript-eslint + Prettier

- `typescript-eslint`'s strict + stylistic type-checked configs.
- `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y` are not decorations. `jsx-a11y` is the only team member that remembers accessibility at 11 PM on day 6.
- `eslint-config-prettier` last, to silence everything Prettier owns.
- `@tanstack/eslint-plugin-query` for Query-specific rules.
- `--max-warnings 0` everywhere. A warning nobody fixes multiplies until the linter stops reporting. **One warning is a failure.**

### Gate — Husky + lint-staged + `verify.sh`

`scripts/verify.sh` is the single source of truth. Husky's `pre-commit` runs `lint-staged` and `--quick`; `pre-push` runs `--full`. The CI workflow runs `--full` with the same environment. Local and CI cannot diverge — that is the whole point.

### Package manager — pnpm

Fast, deterministic, disk-efficient. The version is pinned via `packageManager` in `package.json` and `corepack enable`; without that, a lockfile generated with a different version produces the classic "works on my machine".

---

## Intentionally excluded

The following are deliberately **not** in the stack:

- **Redux, Zustand, Jotai, MobX.** Server state is in the Query cache; view state is in the URL; the library is its own validated module. If you reach the end of a feature needing a global store, the model is wrong somewhere — that conversation is part of the project.
- **A custom backend or proxy.** Out of scope for the project; the token is shipped in the bundle and the trade-off is documented in the README.
- **Service workers for offline persistence.** The localStorage adapter handles current-session persistence; an offline mode with SW is explicitly out of scope.
- **CSS-in-JS libraries.** Tailwind 4's CSS-first design tokens are the source of truth; a runtime CSS layer would duplicate the design contract.

---

## Verifying versions

```bash
# Compare installed vs latest stable for every dependency
./scripts/check-versions.sh

# Same script, but exit non-zero if anything is deprecated
./scripts/check-versions.sh --gate
```

The `check-versions.sh` script also fails the gate if any dependency is deprecated. The successor is documented in the script's output and must be migrated to before the next release.
