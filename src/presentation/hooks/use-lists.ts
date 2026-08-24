// presentation/hooks/use-lists.ts — the user's themed movie lists.
//
// The hook wraps `LocalListsRepository` with a TanStack Query
// store and adds three behaviours the issue calls out:
//
//   1. **Optimistic mutations** — `create`, `update`, `remove`,
//      `addMovie`, `removeMovie` update the cache before the
//      storage write returns, so the UI reflects the new state
//      instantly. A failed write rolls the cache back to the
//      previous snapshot.
//
//   2. **Cross-cache invalidation** — the lists live in a single
//      query key (`['lists', 'saved']`), so any component that
//      reads them sees the same data. The create form, the
//      lists overview, and the detail page share one cache.
//
//   3. **No silent data loss** — the repository logs corrupted
//      data on read; the hook forwards the `corrupted` flag so
//      the page can show a one-time notice. The corrupted data
//      is gone, but the page is not crashed.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getListsRepository } from '@/infrastructure/storage';
import { type Lists, type ListsRepository } from '@/application/ports/lists-repository';
import { type List } from '@/domain/lists/list';

export const LISTS_QUERY_KEY = ['lists', 'saved'] as const;

interface ListsQueryData {
  readonly lists: Lists;
  readonly corrupted: boolean;
}

const EMPTY: ListsQueryData = { lists: { lists: [] }, corrupted: false };

function readQueryData(client: ReturnType<typeof useQueryClient>): ListsQueryData {
  return client.getQueryData<ListsQueryData>(LISTS_QUERY_KEY) ?? EMPTY;
}

export interface UseLists {
  readonly lists: readonly List[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly corrupted: boolean;
  readonly getList: (id: string) => List | undefined;
  readonly create: (list: List) => Promise<List>;
  readonly update: (list: List) => Promise<List>;
  readonly remove: (id: string) => Promise<void>;
  readonly addMovie: (listId: string, movieId: number) => Promise<void>;
  readonly removeMovie: (listId: string, movieId: number) => Promise<void>;
  readonly isCreating: boolean;
  readonly isUpdating: boolean;
  readonly isRemoving: boolean;
  readonly isAddingMovie: boolean;
  readonly isRemovingMovie: boolean;
}

function useListsRepository(): ListsRepository {
  // The singleton is a module-level cache; this hook returns the
  // same instance for every render, so the test reset function
  // (`__resetListsRepositoryForTests`) only needs to be called
  // once per test, not per render.
  return useMemo(() => getListsRepository(), []);
}

function mapLists(current: readonly List[], id: string, fn: (list: List) => List): readonly List[] {
  return current.map((l) => (l.id === id ? fn(l) : l));
}

export function useLists(): UseLists {
  const repository = useListsRepository();
  const queryClient = useQueryClient();

  const query = useQuery<ListsQueryData>({
    queryKey: LISTS_QUERY_KEY,
    queryFn: () => repository.readWithDiagnostics(),
    staleTime: Infinity,
  });

  const createMutation = useMutation<List, Error, List, { previous: ListsQueryData | undefined }>({
    mutationFn: (list) =>
      repository.create(list).then((res) => res.lists.find((l) => l.id === list.id) ?? list),
    onMutate: async (list) => {
      await queryClient.cancelQueries({ queryKey: LISTS_QUERY_KEY });
      const previous = queryClient.getQueryData<ListsQueryData>(LISTS_QUERY_KEY);
      const nextLists = [...(previous?.lists.lists ?? []).filter((l) => l.id !== list.id), list];
      queryClient.setQueryData<ListsQueryData>(LISTS_QUERY_KEY, {
        lists: { lists: nextLists },
        corrupted: previous?.corrupted ?? false,
      });
      return { previous };
    },
    onError: (_error, _list, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(LISTS_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY });
    },
  });

  const updateMutation = useMutation<List, Error, List, { previous: ListsQueryData | undefined }>({
    mutationFn: (list) =>
      repository.update(list).then((res) => res.lists.find((l) => l.id === list.id) ?? list),
    onMutate: async (list) => {
      await queryClient.cancelQueries({ queryKey: LISTS_QUERY_KEY });
      const previous = queryClient.getQueryData<ListsQueryData>(LISTS_QUERY_KEY);
      const nextLists = mapLists(previous?.lists.lists ?? [], list.id, () => list);
      queryClient.setQueryData<ListsQueryData>(LISTS_QUERY_KEY, {
        lists: { lists: nextLists },
        corrupted: previous?.corrupted ?? false,
      });
      return { previous };
    },
    onError: (_error, _list, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(LISTS_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY });
    },
  });

  const removeMutation = useMutation<
    undefined,
    Error,
    string,
    { previous: ListsQueryData | undefined }
  >({
    mutationFn: async (id) => {
      await repository.remove(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: LISTS_QUERY_KEY });
      const previous = queryClient.getQueryData<ListsQueryData>(LISTS_QUERY_KEY);
      const nextLists = (previous?.lists.lists ?? []).filter((l) => l.id !== id);
      queryClient.setQueryData<ListsQueryData>(LISTS_QUERY_KEY, {
        lists: { lists: nextLists },
        corrupted: previous?.corrupted ?? false,
      });
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(LISTS_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY });
    },
  });

  const addMovieMutation = useMutation<
    undefined,
    Error,
    { readonly listId: string; readonly movieId: number },
    { previous: ListsQueryData | undefined }
  >({
    mutationFn: async ({ listId, movieId }) => {
      await repository.addMovie(listId, movieId);
    },
    onMutate: async ({ listId, movieId }) => {
      await queryClient.cancelQueries({ queryKey: LISTS_QUERY_KEY });
      const previous = queryClient.getQueryData<ListsQueryData>(LISTS_QUERY_KEY);
      const nextLists = mapLists(previous?.lists.lists ?? [], listId, (l) => {
        if (l.movieIds.includes(movieId)) return l;
        return { ...l, movieIds: [...l.movieIds, movieId] };
      });
      queryClient.setQueryData<ListsQueryData>(LISTS_QUERY_KEY, {
        lists: { lists: nextLists },
        corrupted: previous?.corrupted ?? false,
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(LISTS_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY });
    },
  });

  const removeMovieMutation = useMutation<
    undefined,
    Error,
    { readonly listId: string; readonly movieId: number },
    { previous: ListsQueryData | undefined }
  >({
    mutationFn: async ({ listId, movieId }) => {
      await repository.removeMovie(listId, movieId);
    },
    onMutate: async ({ listId, movieId }) => {
      await queryClient.cancelQueries({ queryKey: LISTS_QUERY_KEY });
      const previous = queryClient.getQueryData<ListsQueryData>(LISTS_QUERY_KEY);
      const nextLists = mapLists(previous?.lists.lists ?? [], listId, (l) => ({
        ...l,
        movieIds: l.movieIds.filter((id) => id !== movieId),
      }));
      queryClient.setQueryData<ListsQueryData>(LISTS_QUERY_KEY, {
        lists: { lists: nextLists },
        corrupted: previous?.corrupted ?? false,
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(LISTS_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY });
    },
  });

  const data = query.data ?? EMPTY;
  const lists = data.lists.lists;

  const getList = useCallback(
    (id: string): List | undefined => lists.find((l) => l.id === id),
    [lists],
  );

  return {
    lists,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    corrupted: data.corrupted,
    getList,
    create: async (list) => {
      const created = await createMutation.mutateAsync(list);
      return created;
    },
    update: async (list) => {
      const updated = await updateMutation.mutateAsync(list);
      return updated;
    },
    remove: async (id) => {
      await removeMutation.mutateAsync(id);
    },
    addMovie: async (listId, movieId) => {
      await addMovieMutation.mutateAsync({ listId, movieId });
    },
    removeMovie: async (listId, movieId) => {
      await removeMovieMutation.mutateAsync({ listId, movieId });
    },
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isRemoving: removeMutation.isPending,
    isAddingMovie: addMovieMutation.isPending,
    isRemovingMovie: removeMovieMutation.isPending,
  };
}

// Internal helper re-exported only for the test suite that
// wants to manipulate the cache directly (e.g. to seed it
// without going through the storage layer).
export const __test = { readQueryData };
