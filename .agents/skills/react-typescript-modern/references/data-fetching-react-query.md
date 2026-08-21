# Data fetching: TanStack Query v5 in Cineteca

`@tanstack/react-query` (formerly `react-query`) owns **server state** — anything that lives on TMDB and needs fetching, caching, and background sync. It is not a replacement for `useState`/`useReducer`/Context, which still own **client state** (a modal's open/closed flag, a theme toggle, form-field values before submission). Mixing the two — putting UI-only state into the query cache, or hand-rolling `useState` + `useEffect` for server data — is the most common source of tangled state management in React apps.

Cineteca's rule is firmer than "prefer TanStack Query": the domain is pure TypeScript and does not know about Query, the cache, or React. This file describes the presentation-side usage; the adapters that actually call TMDB live in `src/infrastructure/api/<resource>/` and validate every response with Zod before exposing it. See [`docs/architecture.md`](../../../docs/architecture.md) and the [Project Guide](https://gist.github.com/xXAreizaXx/16cb8c169ab015adb0be35fac4992863).

## Setup

Already wired in the app skeleton (`QueryClientProvider` is mounted in `src/presentation/providers/app-providers.tsx`). When adding a new feature you should not need to touch providers — just consume the cache via the hooks.

```tsx
import { queryOptions, useQuery } from '@tanstack/react-query';

// Resource module: src/infrastructure/api/movies/<resource>.ts
// (this file owns the Zod schema for the response)
export function movieQueryOptions(movieId: string) {
  return queryOptions({
    queryKey: movieKeys.detail(movieId),
    queryFn: () => fetchMovie(movieId), // returns a validated domain entity
    staleTime: 5 * 60 * 1000, // 5 min — pick this per resource, not globally
  });
}

// Component
function MovieDetail({ movieId }: { movieId: string }) {
  const { data: movie, isPending, error } = useQuery(movieQueryOptions(movieId));

  if (isPending) return <MovieDetailSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <MovieCard movie={movie} />;
}
```

## Query key factories, not ad-hoc arrays

Scattering string/array query keys through the codebase makes cache invalidation unpredictable — you end up guessing which keys a mutation needs to invalidate. Centralize them per resource:

```tsx
// src/infrastructure/api/movies/keys.ts
export const movieKeys = {
  all: ['movies'] as const,
  lists: () => [...movieKeys.all, 'list'] as const,
  list: (filters: MovieFilters) => [...movieKeys.lists(), filters] as const,
  details: () => [...movieKeys.all, 'detail'] as const,
  detail: (id: string) => [...movieKeys.details(), id] as const,
};
```

Notice the filters argument: it must be the **normalized** form, not whatever the URL happened to contain. A query for `?genre=28&page=2` and a query for `?page=2&genre=28` must produce the same cache key, or the same movie shows up twice in the cache. See `references/routing-react-router.md` for the URL-as-state side.

## `queryOptions()` — define once, use in three places

`queryOptions()` (v5) gives you a single, type-safe, reusable definition that works identically in `useQuery`, `useSuspenseQuery`, and a router loader's `ensureQueryData` — see the router-integration example below.

```tsx
import { queryOptions, useQuery } from '@tanstack/react-query';

function movieQueryOptions(movieId: string) {
  return queryOptions({
    queryKey: movieKeys.detail(movieId),
    queryFn: () => fetchMovie(movieId),
    staleTime: 5 * 60 * 1000, // 5 min — pick this per resource, not globally
  });
}

function MovieDetail({ movieId }: { movieId: string }) {
  const { data: movie, isPending, error } = useQuery(movieQueryOptions(movieId));

  if (isPending) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <ProfileCard movie={movie} />;
}
```

Do not leave every query at the default `staleTime: 0` — that means "refetch on every mount and every window focus," which is rarely what you actually want. Set it per query based on how often that data actually changes: seconds for a live dashboard number, minutes for a user profile, much longer for something like a list of countries.

## What changed from the version most training data remembers (v3/v4)

| Old (v3/v4, `react-query`)                                             | Current (v5, `@tanstack/react-query`)                                      | Why                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useQuery({ queryFn, onSuccess, onError, onSettled })`                 | No query-level callbacks                                                   | Removed — see below for replacements                                                                                                                                                                                                   |
| `cacheTime`                                                            | `gcTime`                                                                   | Renamed for clarity ("garbage collection time")                                                                                                                                                                                        |
| `status === 'loading'` / `isLoading` as the primary "no data yet" flag | `isPending`                                                                | `status: 'loading'` was renamed to `'pending'`. `isLoading` still exists but is now a derived shorthand for `isPending && isFetching` (first-load specifically) — prefer `isPending` when you just mean "I have nothing to render yet" |
| `keepPreviousData: true`                                               | `placeholderData: keepPreviousData` (import the `keepPreviousData` helper) | Boolean option replaced with an explicit placeholder-data strategy                                                                                                                                                                     |
| `useErrorBoundary`                                                     | `throwOnError`                                                             | Renamed                                                                                                                                                                                                                                |

### Query-level callbacks are gone — here is what to use instead

`useQuery`/`useInfiniteQuery` no longer accept `onSuccess`/`onError`/`onSettled`. Reach for whichever of these actually matches what you were trying to do:

- **Side effect tied to the data itself** (e.g. sync fetched data into a form's default values): `useEffect` keyed on `data`.
- **Cross-cutting concern across many queries** (e.g. toast on any failed request, log all errors to Sentry): register it once on the `QueryClient`, not per-query.
  ```tsx
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => toast.error(error.message),
    }),
  });
  ```
- **Want failures to be handled by an Error Boundary instead of inline `error` state**: `throwOnError: true` on the query, paired with a `<ErrorBoundary>` above it.

**Mutations kept their callbacks** — `useMutation({ onSuccess, onError, onSettled })` is unchanged, because a mutation is an imperative, one-off action where "do this when it finishes" is exactly the right shape.

```tsx
const { mutate, isPending } = useMutation({
  mutationFn: updateMovie,
  onSuccess: (updatedMovie) => {
    queryClient.setQueryData(movieKeys.detail(updatedMovie.id), updatedMovie);
  },
  onError: (error) => toast.error(error.message),
});
```

## Optimistic updates

```tsx
const { mutate } = useMutation({
  mutationFn: updateMovie,
  onMutate: async (newMovie) => {
    await queryClient.cancelQueries({ queryKey: movieKeys.detail(newMovie.id) });
    const previous = queryClient.getQueryData(movieKeys.detail(newMovie.id));
    queryClient.setQueryData(movieKeys.detail(newMovie.id), newMovie);
    return { previous };
  },
  onError: (_err, newMovie, context) => {
    // Roll back on failure
    queryClient.setQueryData(movieKeys.detail(newMovie.id), context?.previous);
  },
  onSettled: (_data, _err, newMovie) => {
    queryClient.invalidateQueries({ queryKey: movieKeys.detail(newMovie.id) });
  },
});
```

## Pairing with React Router loaders (avoid double-fetching)

If the router is also fetching data (see `references/routing-react-router.md`), do not let both the loader and the component independently fetch the same resource. Use the same `queryOptions()` in both places: the loader ensures the cache is warm before the route renders, and the component reads from that same cache via `useSuspenseQuery` — one network request, not two.

```tsx
// route module
export const movieRoute = {
  path: 'movies/:movieId',
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(movieQueryOptions(params.movieId!)),
  Component: MovieRouteComponent,
};

function MovieRouteComponent() {
  const { movieId } = useParams();
  const { data: movie } = useSuspenseQuery(movieQueryOptions(movieId!));
  return <MovieCard movie={movie} />;
}
```

## Devtools

`<ReactQueryDevtools />` is mounted in `src/presentation/providers/app-providers.tsx` during development. It visualizes cache state, staleness, and refetch activity, and is usually the fastest way to debug "why is this refetching" or "why is this stale" questions instead of guessing.
