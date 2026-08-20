# Cineteca

> A web application for discovering movies and building a personal cinema library — explore the catalog, open a film's page, save what you want to watch, organize themed lists, and share exactly what you are seeing with a single link.

Cineteca is a client-side web app that consumes [TMDB](https://www.themoviedb.org), a public REST API with over a decade of catalog history. There is no backend and no database to provision: the user's library lives in their own browser, validated against the same rigor as any network response.

---

## Features

- **Home** — what is trending this week, with one click into Explore.
- **Explore** — filter the catalog by genre, year, minimum rating, minimum vote count, and sort order. Filters live in the URL, so reloading preserves the view and sharing the link reproduces it in another browser.
- **Search** — free-text search with debounced requests; one keystroke does not equal one request.
- **Movie detail** — full metadata, cast, and trailers loaded in a single expanded request. Shareable URL per film.
- **My Cineteca** — your saved films and themed local lists. Save and remove with optimistic updates; the action reverts cleanly if storage fails.
- **Four states, every screen** — every view that shows data handles loading, error, empty initial, and empty by filter. A filter mismatch is not a dead end; it offers a way out.
- **Three edges, all validated** — network responses, localStorage reads, and URL parameters are each parsed through Zod schemas. A hand-typed nonsense filter does not break the screen.
- **International formats** — dates, numbers, money, and durations use the browser's `Intl` APIs. The same film shows correctly in Spanish, English, and German.
- **Keyboard-navigable end to end** — focus is always visible, route changes move focus to the new heading, and the document title updates so screen readers follow the navigation. The layout holds at 200% zoom.

---

## Screens

| Route                          | Purpose                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `/`                            | Trending this week                                                                            |
| `/explore`                     | Filters + results; filters live in the URL                                                    |
| `/search`                      | Free-text search with debounce                                                                 |
| `/movie/:id`                   | Full detail page, shareable URL                                                                |
| `/my-cineteca`                 | Saved films and local lists                                                                    |
| `/my-cineteca/lists/:slug`     | A single local list, viewable and shareable                                                    |

---

## Quick start

```bash
# 1. Clone the repository
git clone https://github.com/Team-Centinela/Project-save-me-of-the-riwi.git
cd Project-save-me-of-the-riwi

# 2. Install dependencies
corepack enable       # ensures pnpm version matches package.json
pnpm install

# 3. Configure the environment
cp .env.example .env.local
# Edit .env.local and set VITE_TMDB_READ_TOKEN to your TMDB Read Access Token.
# The token is bundled into the client; use a practice account that can be
# rotated in one minute from the TMDB API panel.

# 4. Start the dev server
pnpm dev              # http://localhost:5173
```

### Getting a TMDB token

1. Create a **practice account** at [themoviedb.org](https://www.themoviedb.org) (not a personal one).
2. Go to *Settings → API* and request access. Declare it as an educational, non-commercial project.
3. Copy the **API Read Access Token** (the second credential).

> The token is shipped inside the client bundle and is therefore public. That is acceptable here precisely because it is read-only, scoped to a practice account, and rotable in one minute from the same panel.

---

## Scripts

| Command                              | What it does                                              |
| ------------------------------------ | --------------------------------------------------------- |
| `pnpm dev`                           | Start the dev server                                      |
| `pnpm build`                         | Production build                                          |
| `pnpm preview`                       | Preview the production build                              |
| `pnpm test`                          | Run tests with coverage                                   |
| `pnpm test:watch`                    | Run tests in watch mode                                   |
| `pnpm lint`                          | Run ESLint (zero warnings tolerated)                      |
| `pnpm check-types`                   | Run TypeScript type checking                              |
| `pnpm format`                        | Format code with Prettier                                 |
| `bash scripts/verify.sh --quick`     | Pre-commit gate: format, lint, types                      |
| `bash scripts/verify.sh --full`      | Pre-push and CI gate: above plus tests, build, deps check |

---

## Architecture

Cineteca follows Clean Architecture with a strict dependency rule. The **domain** layer is pure TypeScript and knows nothing about React, Axios, or the cache. **Application** defines the ports (`MovieRepository`, `LibraryStorage`, …). **Infrastructure** implements them (HTTP client, localStorage adapter). **Presentation** is the only place React lives.

The rule is enforced by the linter, not by convention: importing `react` inside `src/domain/` fails the gate. If you are unsure where a file belongs, see [`docs/architecture.md`](./docs/architecture.md).

```
src/
├── domain/           # Pure TypeScript — entities, states, policies, validation schemas, formatters
├── application/      # Use cases and ports (interfaces)
├── infrastructure/   # HTTP client, API modules, storage adapters
├── presentation/     # React components, routes, hooks, providers, copy
├── config/           # Environment validation
└── test/             # MSW server for testing
```

---

## Tech stack

A versioned table lives in [`docs/tech-stack.md`](./docs/tech-stack.md). The summary:

| Layer        | Tool                                                              |
| ------------ | ----------------------------------------------------------------- |
| Build        | Vite                                                              |
| Language     | TypeScript (strict)                                               |
| UI           | React                                                             |
| Routing      | React Router                                                      |
| Styles       | Tailwind CSS                                                      |
| Data         | TanStack Query                                                    |
| HTTP         | Axios (one instance, one place)                                   |
| Validation   | Zod                                                               |
| Forms        | React Hook Form + Zod resolver                                    |
| Virtualization | `@tanstack/react-virtual`                                       |
| Testing      | Vitest + Testing Library + MSW + axe-core                         |
| Quality      | ESLint + typescript-eslint + Prettier                             |
| Gate         | Husky + lint-staged + `verify.sh`                                 |
| Package mgr  | pnpm                                                              |

The intentional exclusions are documented in [`docs/tech-stack.md`](./docs/tech-stack.md): no Redux, no Zustand, no Jotai. Server state lives in the Query cache, view state lives in the URL, the library lives in its own validated module.

---

## Quality gate

The gate is the same script locally and in CI: `scripts/verify.sh`. Its steps are

```
format → lint → types → tests → build → dependency check
```

A pull request cannot land without the `gate` CI check green. Branch protection on `main` and `develop` enforces this. The full reference — modes, hooks, time budget, how to read a failure — is in [`docs/quality-gate.md`](./docs/quality-gate.md).

---

## Accessibility

- Every interactive element is keyboard reachable; focus is always visible.
- A movie card is a single link with an accessible name like `"The Godfather, 1972, 8.7 out of 10"`.
- On route change, the document title updates and focus moves to the new heading.
- Form errors are announced to assistive tech, not just painted in red, and focus jumps to the first invalid field.
- The layout holds at 200% zoom with no horizontal scroll.
- Status (released / unreleased / unknown) is never communicated by color alone.

---

## TMDB attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

> _"This product uses the API of TMDB but is not endorsed or certified by TMDB."_

This attribution is required by TMDB's terms of use and is rendered in the application footer.

---

## Contributing

To contribute, read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for branching, commit messages, the PR process, the quality gate, and the architecture rules.

For bugs and feature requests, please use the issue templates under [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE).

---

## References

The full project and baseline guides are mirrored inside this repo so they are always reachable:

- **Project guide** (what we build and why) — [`docs/guides/project-guide.md`](./docs/guides/project-guide.md) · [upstream gist](https://gist.github.com/xXAreizaXx/16cb8c169ab015adb0be35fac4992863)
- **Technical baseline** (the scaffold that produced this repo) — [`docs/guides/baseline.md`](./docs/guides/baseline.md) · [upstream gist](https://gist.github.com/xXAreizaXx/8566c4410fe16fab5864abb72ae55e4a)

If a local copy and the upstream gist diverge, the gist is canonical.
