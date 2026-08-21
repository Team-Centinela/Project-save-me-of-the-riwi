# Routing: React Router v8 in Cineteca

These notes are calibrated to `react-router@8.3.0` (pinned in `package.json`) and the layered architecture the linter enforces. For project-level context, see [`docs/architecture.md`](../../../docs/architecture.md) and the [Baseline Guide](https://gist.github.com/xXAreizaXx/8566c4410fe16fab5864abb72ae55e4a).

## The package changed shape

As of v8, `react-router-dom` no longer exists as a separate package. Everything ships from `react-router`, with a narrow set of browser entry points under `react-router/dom`:

```tsx
// Core routing — components, hooks, data APIs.
// Everything in this list comes from 'react-router', NOT from 'react-router/dom':
//   Routes, Route, Outlet, Link, NavLink, Form, ScrollRestoration,
//   useNavigate, useParams, useSearchParams, useLoaderData, ...
import { Routes, Route, Outlet, useNavigate, useParams, Link } from 'react-router';

// 'react-router/dom' exports ONLY:
//   - RouterProvider (for createBrowserRouter / createMemoryRouter)
//   - HydratedRouter (framework-mode SSR entry point)
//   - unstable_* RSC helpers
// It does NOT re-export Link, NavLink, Form, Outlet, etc.
import { RouterProvider } from 'react-router/dom';
```

If you see `from 'react-router-dom'` in a codebase, that is either an older major (check `package.json` before "fixing" it) or a leftover that needs updating for a v8 project — do not assume, check.

React Router v8 is **ESM-only** and requires **Node 22.22+**, **React 19.2.7+**, and **Vite 7+**. Cineteca's `package.json` satisfies all four (`engines.node = ">=22"`, `react@^19.2.8`, `vite@^8.2.0`). The `tsconfig` `compilerOptions.target` and `compilerOptions.lib` must be at least `ES2022` — older targets trip the package's `exports` map.

## v5 muscle memory that is still floating around

React Router v5 has been gone for years, but its API keeps surfacing in generated code:

| v5 (gone)                    | Current                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `<Switch>`                   | `<Routes>`                                                     |
| `useHistory()`               | `useNavigate()`                                                |
| `<Route component={Home} />` | `<Route element={<Home />} />` or `<Route Component={Home} />` |
| `<Route exact path="/">`     | Exact matching is the default now — `exact` does not exist     |

## Three modes — pick data mode unless there is a reason not to

React Router supports three ways of wiring up routes:

1. **Declarative** (`<BrowserRouter><Routes><Route>`) — routes rendered as JSX, no loaders/actions. Fine for a small app with no server data per route, or when embedding routing inside a component tree you do not control at the top level.
2. **Data mode** (`createBrowserRouter` + `<RouterProvider>`) — routes as data, with `loader`/`action`/`errorElement` per route. **This is the mode Cineteca uses** — see `src/presentation/routes/router.tsx`. It moves data-fetching out of `useEffect` and lets the router coordinate loading/error states across nested routes instead of every component managing its own.
3. **Framework mode** (file-based routing, SSR, via the React Router "framework" — formerly Remix) — only relevant if the project is explicitly built on it; do not introduce it into Cineteca.

### Data mode example

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      {
        path: 'movies/:movieId',
        loader: async ({ params }) => fetchMovie(params.movieId!),
        Component: MovieDetail,
        errorElement: <MovieNotFound />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

function MovieDetail() {
  const movie = useLoaderData(); // typed via the loader's return in TS setups using route typegen
  return <MovieCard movie={movie} />;
}
```

Cineteca also uses TanStack Query. When both are in play, prefer wiring the loader through `queryClient.ensureQueryData(...)` and reading via `useSuspenseQuery` in the component, rather than a bare `fetch` in the loader — see the router-integration section in `references/data-fetching-react-query.md` to avoid fetching the same data twice.

## The URL is a third untrusted edge

In Cineteca, the URL is treated with the same rigor as the network and localStorage. A filter with an absurd value typed by hand in the address bar cannot break the screen — it is validated the same way a network response is, and falls back to defaults with a clear empty state.

Two practical consequences for routing work:

- **Filters live in `URLSearchParams`, not in component state.** Use `useSearchParams` (or, in a loader/action, `new URL(request.url).searchParams.get(...)`) and normalize the result with Zod before it ever reaches the query key.
- **Same filters → same cache key.** A query for `?genre=28&page=2` and a query for `?page=2&genre=28` must produce the same key, or the same movie shows up twice in the cache. Sort keys before hashing them.

## Middleware (stable by default in v8)

Middleware runs around loaders/actions for a route tree — the right place to centralize concerns like auth checks or logging instead of repeating a redirect check inside every route's loader.

Import the type from `react-router`, **not** from `Route.*`. The `Route.*` namespace is emitted by `@react-router/dev`'s typegen in **Framework mode** (the former Remix); Cineteca is a plain Vite SPA in Data mode and has no `@react-router/dev`, so `Route.MiddlewareFunction` will not resolve here.

```tsx
import { createBrowserRouter, redirect, type MiddlewareFunction } from 'react-router';

const requireAuth: MiddlewareFunction = async ({ context }, next) => {
  if (!context.user) {
    throw redirect('/login');
  }
  return next();
};

const router = createBrowserRouter([
  {
    path: '/dashboard',
    middleware: [requireAuth],
    Component: Dashboard,
  },
]);
```

The `context` argument is typed as `RouterContextProvider` in v8 — that is the new contract that replaced the old `unstable_createContext`-shaped context. Use a plain `createContext` from `react-router` and call `router.context.set(ctx, value)` (or the `.get()` form) to thread values through loaders, actions, and middleware.

Cineteca does not have auth — the project explicitly excludes it — so middleware is currently used for cross-cutting concerns like "this route requires the cache to be warmed" rather than auth gating. Keep it that way.

## Mutations: `<Form>`, actions, and `useFetcher`

For anything that mutates data, prefer the router's `<Form>` + `action` pair over a manual `onSubmit` handler that calls `fetch` and then imperatively navigates — the router handles the pending UI, revalidation of affected loaders, and error surfacing for you:

```tsx
{
  path: "movies/:movieId/edit",
  action: async ({ request, params }) => {
    const formData = await request.formData();
    await updateMovie(params.movieId!, formData);
    return redirect(`/movies/${params.movieId}`);
  },
  Component: EditMovie,
}

function EditMovie() {
  return (
    <Form method="post">
      <input name="title" />
      <button type="submit">Save</button>
    </Form>
  );
}
```

Use `useFetcher()` instead of `<Form>` when you need to submit without a full navigation — e.g. a "like" button in a list item that should not change the URL or scroll position.

For library mutations (save / unsave in the personal cineteca), the pattern is the same — `<Form>` with `method="post"`, an action that writes through the storage port under `src/infrastructure/storage/`, and revalidation of the affected loaders. The action is the boundary that validates what the storage layer is about to persist; do not skip it.

## When `useEffect` is still the right call for navigation-adjacent work

Loaders cover "data this route needs before it renders." Genuinely client-only, interaction-driven fetches (e.g. autocomplete suggestions as the user types) still belong in the component, generally via TanStack Query rather than a raw `useEffect`.
