# Architecture

Cineteca follows **Clean Architecture** with a strict **dependency rule**: dependencies point inward, and the innermost layer is pure TypeScript. The rule is enforced by the linter — see `eslint.config.js` — not by convention. A file that violates it fails `pnpm lint`, locally and in CI.

This document is a reference. For the contributor-facing summary, see the [Architecture rules](../../CONTRIBUTING.md#architecture-rules) section of `CONTRIBUTING.md`.

---

## Layer map

```
src/
├── domain/           pure TypeScript — entities, states, policies, schemas, formatters
├── application/      use cases and ports (interfaces)
├── infrastructure/   HTTP client, API modules, storage adapters
├── presentation/     React components, routes, hooks, providers, copy
├── config/           environment validation
└── test/             MSW server for testing
```

| Layer            | Responsibility                                                                  | Allowed imports                                          | Forbidden imports                                                |
| ---------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| `domain/`        | Business entities, rules, and formatters                                        | other `domain/` modules                                  | React, Axios, TanStack Query, anything from `application/`, `infrastructure/`, `presentation/` |
| `application/`   | Use cases; ports (interfaces) that the infrastructure must implement            | `domain/`                                                | React, Axios, anything from `presentation/` or `infrastructure/` |
| `infrastructure/` | Implementations of the ports: HTTP calls with validation, storage adapter      | `domain/`, `application/`, axios (only in `http/`)       | React, anything from `presentation/`                             |
| `presentation/`  | React UI, routes, hooks, providers, copy                                         | everything below it                                      | —                                                                |
| `infrastructure/http/` | The single place that imports `axios`                                       | axios                                                     | anywhere else that imports axios                                  |

The **single-source rule for the HTTP library** is the most concrete. `axios` is allowed in exactly one directory tree, `src/infrastructure/http/**`. The linter rejects the import anywhere else. This keeps the transport replaceable and makes the network edge easy to find.

---

## Where does this file go?

The question that comes up every day is "where does this file live?". Use this table:

| What you are writing                                                   | Goes in                          |
| ---------------------------------------------------------------------- | -------------------------------- |
| A business rule, entity, state, formatter, schema, policy              | `domain/`                        |
| An interface for "something that fetches X" or "something that stores Y" | `application/ports/`           |
| A network call with its validation                                     | `infrastructure/api/`            |
| The HTTP client and its interceptors                                   | `infrastructure/http/`           |
| The browser storage adapter                                            | `infrastructure/storage/`        |
| A React component, route, hook, provider                               | `presentation/`                  |
| A user-visible string                                                  | `presentation/copy/`             |
| Environment validation                                                 | `config/`                        |

**Rule of thumb:** if a file in `domain/` would need to install something to work, it is in the wrong folder.

---

## The dependency rule, enforced

`eslint.config.js` contains three `no-restricted-imports` blocks:

1. Files under `src/domain/**/*.ts` cannot import `react`, `react-*`, `axios`, `@tanstack/*`, `react-hook-form`, or anything from `@/presentation/*`, `@/infrastructure/*`, `@/application/*`.
2. Files under `src/application/**/*.ts` cannot import from `@/presentation/*`, `@/infrastructure/*`, `axios`, or `react*`.
3. Any file under `src/**/*.{ts,tsx}` except `src/infrastructure/http/**` cannot import `axios`.

Try it:

```bash
mkdir -p src/domain/shared
echo "import { useState } from 'react'; export const x = useState;" > src/domain/shared/bad.ts
pnpm lint    # must FAIL
rm src/domain/shared/bad.ts
pnpm lint    # must pass
```

A rule that only lives in a diagram breaks the first time someone is in a hurry. A rule that lives in the linter and the CI does not.

---

## Domain modeling conventions

These are the rules that govern the `domain/` layer. They are not stylistic preferences; they are the contract that makes the type system carry the truth instead of the screens.

### States as discriminated unions

States are modeled as tagged unions. Each branch carries exactly the data that belongs to it.

```ts
type MovieState =
  | { kind: 'released'; releaseDate: Date }
  | { kind: 'unreleased'; expectedReleaseDate: Date }
  | { kind: 'unknown' };

type RatingReliability =
  | { kind: 'consolidated'; votes: number; average: number }
  | { kind: 'preliminary'; votes: number; average: number }
  | { kind: 'absent' };
```

A `switch` over a tagged union with a default that the compiler considers unreachable forces every variant to be handled. Add a new variant, the compiler tells you which screens forgot it.

### Absences are explicit in the type

No `0` and no empty string from TMDB survives the validation edge. All of them are translated to "no data" at the boundary.

```ts
type NoData = { kind: 'absent' } | { kind: 'present'; value: string };
```

Inside the domain, the type says whether the data is there. Screens are forced to handle absence.

### Money as integers

A budget is not a floating-point number — that arithmetic loses cents. A budget is an integer in the smallest unit of the currency.

```ts
type Money = { amount: number; currency: string }; // amount in the smallest unit
```

Three rules to internalize:

1. **Never a floating-point decimal for money.** Integers in the smallest unit, always.
2. **Currency and locale are different things.** The currency is data (TMDB reports USD); the format is a viewer preference. `$63,000,000` in `en-US` and `63.000.000 $` in `de-DE` are both correct.
3. **Formatting is delegated.** Use `Intl.NumberFormat` for money, `Intl.DateTimeFormat` for dates, and `Intl.PluralRules` for plurals. A thousand separator written with `replace` is a bug waiting for a new locale.

---

## The three untrusted edges

Every edge that crosses a trust boundary is validated with the same rigor.

1. **Network** — API responses are validated with Zod before use. Breaking a field in an MSW handler must produce a localized, clear error — never a silent wrong value.
2. **Local storage** — data is validated on read with the same schema that produced it on write. Corrupted or invented data is discarded gracefully.
3. **URL** — filter values written by hand in the URL cannot break the screen. They are parsed with Zod and fall back to defaults on failure.

The URL edge is the one most apps forget. Cineteca treats it like the other two.

---

## The four states of every screen

Any screen that shows data has four paths:

| State            | What it shows                                                              |
| ---------------- | -------------------------------------------------------------------------- |
| **Loading**      | A skeleton with the real shape of the upcoming content, not a centered spinner |
| **Error**        | Plain language and a retry button. "We could not load the movies," not "Error 500" |
| **Empty initial** | "Your Cineteca is empty," with a link to explore                          |
| **Empty by filter** | "No movies match these filters," with a button to clear them            |

A filter mismatch is not a dead end — it is a screen with a single action that recovers it.

---

## Caching and state ownership

- **Server state** lives in the TanStack Query cache. It is the only place network data lives.
- **View state** (filters, search query, current page) lives in the URL. Reload preserves it; sharing reproduces it.
- **User library** lives in `localStorage`, behind a validated adapter.

Between these three places there is almost nothing left, which is why Cineteca does not need a global state store.

---

## Copy is code

Every user-visible string lives in `src/presentation/copy/`. No component writes a literal string inline. The reasons are the same as for state:

- Translation is a single-file concern.
- Consistency (e.g. always calling it "Cineteca", never "your library") is enforceable.
- Tests can assert on the copy module without mounting React.
