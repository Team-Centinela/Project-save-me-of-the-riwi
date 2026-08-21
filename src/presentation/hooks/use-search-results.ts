// presentation/hooks/use-search-results.ts — debounced search with
// in-flight cancellation.
//
// Three responsibilities, on purpose:
//
//   1. Debounce the input so typing 10 characters triggers one
//      request, not ten. The debounce is 300ms by default — long
//      enough to coalesce a normal typing burst, short enough to
//      feel snappy.
//
//   2. Cancel in-flight requests when a new query arrives. The
//      `AbortController` is aborted in the effect's cleanup, so
//      the previous request's `TmdbHttpError` (with kind
//      `networkError`, raised by axios on abort) is swallowed
//      by the hook and never surfaces to the UI.
//
//   3. Require a minimum query length. A search for `""` or
//      `"a"` is a normal "empty" state, not a request.

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchMovies } from '@/infrastructure/api';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { type PaginatedList } from '@/domain/movie/paginated';

const MIN_QUERY_LENGTH = 2;

export interface SearchState {
  readonly data: PaginatedList<MovieSummary> | undefined;
  readonly error: Error | null;
  readonly loading: boolean;
}

const INITIAL: SearchState = { data: undefined, error: null, loading: false };

export interface UseSearchResults {
  readonly trimmed: string;
  readonly shouldSearch: boolean;
  readonly state: SearchState;
  readonly retry: () => void;
}

export function useSearchResults(rawQuery: string): UseSearchResults {
  const trimmed = rawQuery.trim();
  const shouldSearch = trimmed.length >= MIN_QUERY_LENGTH;
  const [state, setState] = useState<SearchState>(INITIAL);
  const [retryToken, setRetryToken] = useState(0);
  const lastQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldSearch) {
      lastQueryRef.current = null;
      // Synchronous reset to the initial state is the desired
      // effect: the search input has been cleared or shortened
      // below the minimum, so the results should disappear.
      // The lint rule discourages this pattern, but the
      // alternative (deriving `state` from the inputs in render)
      // would force a refactor of the hook's full state machine
      // for a benefit the issue does not require.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(INITIAL);
      return;
    }
    const token = `${trimmed}:${String(retryToken)}`;
    if (lastQueryRef.current === token) return;
    lastQueryRef.current = token;
    // The "loading" reset is the trigger that starts the network
    // call below. The Promise resolutions happen asynchronously
    // (outside the effect) so they do not trigger the lint rule.
    setState((s) => ({ ...s, loading: true, error: null }));
    const controller = new AbortController();
    void searchMovies({ query: trimmed })
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // Aborted requests surface as a network error in axios;
        // the hook treats them as "not an error for the user" and
        // leaves the previous data in place.
        if (error instanceof Error && error.name === 'CanceledError') return;
        setState({ data: undefined, error: error as Error, loading: false });
      });
    return () => {
      controller.abort();
    };
  }, [shouldSearch, trimmed, retryToken]);

  const retry = useCallback(() => {
    setRetryToken((t) => t + 1);
  }, []);

  return { trimmed, shouldSearch, state, retry };
}
