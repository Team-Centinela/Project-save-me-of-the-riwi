// presentation/hooks/use-library.ts — the user's local library.
//
// The hook wraps `LocalLibraryRepository` with a TanStack Query
// store and adds three behaviours the issue calls out:
//
//   1. **Optimistic mutations** — `save` and `remove` update the
//      cache before the storage write returns, so the UI
//      reflects the new state instantly. A failed write rolls
//      the cache back to the previous snapshot.
//
//   2. **Cross-cache invalidation** — the library lives in a
//      single query key (`['library', 'saved']`), so any
//      component that reads it sees the same data. The detail
//      page's "Save" button and the library page's list are
//      the same cache; saving a movie in the detail view
//      updates the library page in the background.
//
//   3. **No silent data loss** — the repository logs corrupted
//      data on read; the hook forwards the `corrupted` flag
//      so the page can show a one-time notice. The
//      corrupted data is gone, but the page is not crashed.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getLibraryRepository } from '@/infrastructure/storage';
import { type Library, type LibraryRepository } from '@/application/ports/library-repository';
import { type LibraryEntry } from '@/domain/library/library-entry';

export const LIBRARY_QUERY_KEY = ['library', 'saved'] as const;

interface LibraryQueryData {
  readonly library: Library;
  readonly corrupted: boolean;
}

const EMPTY: LibraryQueryData = { library: { entries: [] }, corrupted: false };

function readQueryData(client: ReturnType<typeof useQueryClient>): LibraryQueryData {
  return client.getQueryData<LibraryQueryData>(LIBRARY_QUERY_KEY) ?? EMPTY;
}

export interface UseLibrary {
  readonly entries: readonly LibraryEntry[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly corrupted: boolean;
  readonly isInLibrary: (id: number) => boolean;
  readonly save: (entry: LibraryEntry) => Promise<void>;
  readonly remove: (id: number) => Promise<void>;
  readonly isSaving: boolean;
  readonly isRemoving: boolean;
}

function useLibraryRepository(): LibraryRepository {
  // The singleton is a module-level cache; this hook returns
  // the same instance for every render, so the test reset
  // function (`__resetLibraryRepositoryForTests`) only needs
  // to be called once per test, not per render.
  return useMemo(() => getLibraryRepository(), []);
}

export function useLibrary(): UseLibrary {
  const repository = useLibraryRepository();
  const queryClient = useQueryClient();

  const query = useQuery<LibraryQueryData>({
    queryKey: LIBRARY_QUERY_KEY,
    queryFn: () => repository.readWithDiagnostics(),
    staleTime: Infinity,
  });

  const saveMutation = useMutation<
    Library,
    Error,
    LibraryEntry,
    { previous: LibraryQueryData | undefined }
  >({
    mutationFn: (entry) => repository.save(entry),
    onMutate: async (entry) => {
      await queryClient.cancelQueries({ queryKey: LIBRARY_QUERY_KEY });
      const previous = queryClient.getQueryData<LibraryQueryData>(LIBRARY_QUERY_KEY);
      const nextEntries = [
        ...(previous?.library.entries ?? []).filter((e) => e.id !== entry.id),
        entry,
      ];
      queryClient.setQueryData<LibraryQueryData>(LIBRARY_QUERY_KEY, {
        library: { entries: nextEntries },
        corrupted: previous?.corrupted ?? false,
      });
      return { previous };
    },
    onError: (_error, _entry, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(LIBRARY_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
    },
  });

  const removeMutation = useMutation<
    Library,
    Error,
    number,
    { previous: LibraryQueryData | undefined }
  >({
    mutationFn: (id) => repository.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: LIBRARY_QUERY_KEY });
      const previous = queryClient.getQueryData<LibraryQueryData>(LIBRARY_QUERY_KEY);
      const nextEntries = (previous?.library.entries ?? []).filter((e) => e.id !== id);
      queryClient.setQueryData<LibraryQueryData>(LIBRARY_QUERY_KEY, {
        library: { entries: nextEntries },
        corrupted: previous?.corrupted ?? false,
      });
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(LIBRARY_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
    },
  });

  const data = query.data ?? EMPTY;
  const entries = data.library.entries;

  const isInLibrary = useCallback((id: number) => entries.some((e) => e.id === id), [entries]);

  return {
    entries,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    corrupted: data.corrupted,
    isInLibrary,
    save: async (entry) => {
      await saveMutation.mutateAsync(entry);
    },
    remove: async (id) => {
      await removeMutation.mutateAsync(id);
    },
    isSaving: saveMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}

// Internal helper re-exported only for the test suite that
// wants to manipulate the cache directly (e.g. to seed it
// without going through the storage layer).
export const __test = { readQueryData };
