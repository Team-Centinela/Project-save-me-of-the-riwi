# Cineteca

**Movie discovery and personal library web app · API client only (no backend)**

A web application where users discover movies and build their own library — what they want to watch, what they've seen, and themed lists they can share via link.

The catalog is powered by **TMDB**, a public REST API with fifteen years of history. This project does not build a server or database: it consumes the TMDB API and constructs the experience.

---

## Quick Start

### Prerequisites

- Node.js 22+ (LTS)
- pnpm 11.22.0
- A TMDB API Read Access Token (see below)

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd cineteca

# 2. Install dependencies
pnpm install

# 3. Create your environment file
cp .env.example .env.local
# Add your TMDB Read Access Token to .env.local:
# VITE_TMDB_READ_TOKEN=your_token_here

# 4. Start development server
pnpm dev
```

### Getting a TMDB Token

1. Create a **practice account** at [themoviedb.org](https://www.themoviedb.org) (not a personal one)
2. Go to *Settings → API* and request access
3. Copy the **API Read Access Token** (the second credential)

> **Note:** This token will be bundled into the client and is publicly visible. Use a practice account — it can be rotated in one minute from the same panel.

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run tests with coverage |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Run ESLint (zero warnings tolerated) |
| `pnpm check-types` | Run TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `bash scripts/verify.sh --quick` | Run pre-commit quality gate |
| `bash scripts/verify.sh --full` | Run full quality gate (pre-push / CI) |

---

## Project Structure

```
src/
├── domain/           # Pure TypeScript — entities, states, policies, validation schemas
├── application/      # Use cases and ports (interfaces)
├── infrastructure/   # API client, HTTP layer, storage adapters
├── presentation/     # React components, routes, hooks, providers, copy
├── config/           # Environment validation
└── test/             # MSW server for testing
```

**Architecture rule (enforced by linter):** Dependencies point inward. The `domain/` layer knows nothing about React, HTTP libraries, or caching. If a domain file would need to install anything to work, it's in the wrong folder.

---

## Key Design Decisions

### Domain Modeling
- **States as discriminated unions:** Movie state and rating reliability are modeled as tagged unions. Each branch carries exactly the data that belongs to it.
- **Absences explicit in types:** No `0` or empty string from TMDB survives the boundary — all are translated to "no data" at the validation edge.
- **Money as integers:** Budgets are stored in the smallest unit of the currency (cents, not dollars). Never use floating-point decimals for money.

### Three Untrusted Edges
Every edge is validated with the same rigor:
1. **Network** — API responses are validated with Zod before use
2. **Local Storage** — Read data is validated; corrupted data is discarded gracefully
3. **URL** — Filter values written by hand in the URL cannot break the screen

### Caching Strategy
- Server state lives in **TanStack Query cache**
- View state lives in the **URL** (filters, search)
- User's library lives in **browser localStorage**

### The Four States
Every screen that shows data has four paths:
- **Loading** — Skeleton with real card shape, not a spinner
- **Error** — Plain language + retry button
- **Initial Empty** — "Your cineteca is empty" with a link to explore
- **Empty by Filter** — "No movies match these filters" with a button to clear them

---

## Tech Stack

| Layer | Tool | Version |
|---|---|---|
| Build | Vite | 8.2.1 |
| Language | TypeScript (strict) | 6.0.3 |
| UI | React | 19.2.8 |
| Routing | React Router | 8.3.0 |
| Styles | Tailwind CSS | 4.3.3 |
| Data fetching | TanStack Query | 5.101.4 |
| HTTP | Axios | 1.19.0 |
| Validation | Zod | 4.4.3 |
| Forms | React Hook Form | 7.85.0 |
| Testing | Vitest + Testing Library + MSW | 4.1.11 / 16.3.2 / 2.15.0 |
| Linting | ESLint + typescript-eslint + Prettier | 10.8.1 / 8.67.0 / 3.9.6 |

---

## Quality Gate

The gate runs on every commit (`--quick`) and before every push (`--full`):

```
format → lint → types → tests → build → dependency check
```

Zero warnings tolerated. A warning that nobody fixes multiplies until the linter stops reporting.

---

## Screens

| Screen | Description |
|---|---|
| **Home** | Trending movies of the week |
| **Explore** | Filters (genre, year, rating, votes, sort) and results. **Filters live in the URL** — reload preserves the view, sharing reproduces it exactly |
| **Search** | Free-text search with debounce |
| **Movie Detail** | Full movie info with cast and trailers, shareable URL |
| **My Cineteca** | Saved movies and local lists |

---

## Accessibility

- All interactive elements are keyboard reachable
- Focus is always visible
- Movie cards are a single link with accessible name: "The Godfather, 1972, 8.7 out of 10"
- Document title and focus move on route change
- Zoom at 200% without breakage or horizontal scroll
- Rating state is never communicated by color alone

---

## TMDB Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

> *"This product uses the API of TMDB but is not endorsed or certified by TMDB."*

Required by TMDB's terms of use. Display in footer from day one.

---

## Out of Scope

These are deliberate exclusions:
- User accounts, login, roles, permissions (library lives in browser)
- Backend or proxy to hide credentials
- TV series as dedicated sections
- Offline mode with service worker

If you finish the base scope, go for **depth over breadth**: more states covered, better accessibility, more edge cases tested.