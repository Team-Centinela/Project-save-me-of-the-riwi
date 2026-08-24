// presentation/hooks/use-lists.spec.tsx
//
// Verifies the optimistic-mutation contract for the lists
// hook: every mutation updates the cache immediately and rolls
// back when the repository throws.

import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type List } from '@/domain/lists/list';
import { type Lists, type ListsRepository } from '@/application/ports/lists-repository';
import { useLists } from './use-lists';

const baseList = (overrides: Partial<List> = {}): List => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: '90s noir',
  description: 'A short list.',
  movieIds: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

class InMemoryRepository implements ListsRepository {
  shouldFail = false;
  store: readonly List[] = [];
  read(): Promise<Lists> {
    return Promise.resolve({ lists: this.store });
  }
  readWithDiagnostics(): Promise<{ lists: Lists; corrupted: boolean }> {
    return Promise.resolve({ lists: { lists: this.store }, corrupted: false });
  }
  create(list: List): Promise<Lists> {
    if (this.shouldFail) return Promise.reject(new Error('storage failure'));
    const next = [...this.store.filter((l) => l.id !== list.id), list];
    this.store = next;
    return Promise.resolve({ lists: next });
  }
  update(list: List): Promise<Lists> {
    if (this.shouldFail) return Promise.reject(new Error('storage failure'));
    if (!this.store.some((l) => l.id === list.id)) {
      return Promise.resolve({ lists: this.store });
    }
    const next = this.store.map((l) => (l.id === list.id ? list : l));
    this.store = next;
    return Promise.resolve({ lists: next });
  }
  remove(id: string): Promise<Lists> {
    if (this.shouldFail) return Promise.reject(new Error('storage failure'));
    const next = this.store.filter((l) => l.id !== id);
    this.store = next;
    return Promise.resolve({ lists: next });
  }
  addMovie(listId: string, movieId: number): Promise<Lists> {
    if (this.shouldFail) return Promise.reject(new Error('storage failure'));
    const next = this.store.map((l) =>
      l.id === listId
        ? l.movieIds.includes(movieId)
          ? l
          : { ...l, movieIds: [...l.movieIds, movieId] }
        : l,
    );
    this.store = next;
    return Promise.resolve({ lists: next });
  }
  removeMovie(listId: string, movieId: number): Promise<Lists> {
    if (this.shouldFail) return Promise.reject(new Error('storage failure'));
    const next = this.store.map((l) =>
      l.id === listId ? { ...l, movieIds: l.movieIds.filter((id) => id !== movieId) } : l,
    );
    this.store = next;
    return Promise.resolve({ lists: next });
  }
}

let repository: InMemoryRepository;

async function setRepository(): Promise<void> {
  const indexModule = await import('@/infrastructure/storage');
  const set = (
    indexModule as unknown as {
      __setListsRepositoryForTests?: (r: ListsRepository) => void;
    }
  ).__setListsRepositoryForTests;
  if (typeof set === 'function') {
    set(repository);
  }
}

describe('useLists', () => {
  beforeEach(() => {
    window.localStorage.clear();
    repository = new InMemoryRepository();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns an empty list on first read', async () => {
    await setRepository();
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.lists).toEqual([]);
  });

  it('optimistically appends a created list and resolves to it', async () => {
    await setRepository();
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    let created: List | null = null;
    await act(async () => {
      created = await result.current.create(baseList());
    });
    await waitFor(() => {
      expect(result.current.lists.length).toBe(1);
    });
    expect(created?.id).toBe(baseList().id);
    expect(result.current.getList(baseList().id)?.name).toBe('90s noir');
  });

  it('addMovie optimistically updates the list and survives across renders', async () => {
    await setRepository();
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await act(async () => {
      await result.current.create(baseList());
    });
    await waitFor(() => {
      expect(result.current.getList(baseList().id)).toBeDefined();
    });
    await act(async () => {
      await result.current.addMovie(baseList().id, 27205);
    });
    await waitFor(() => {
      expect(result.current.getList(baseList().id)?.movieIds).toEqual([27205]);
    });
  });

  it('removeMovie optimistically removes the id from the list', async () => {
    await setRepository();
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await act(async () => {
      await result.current.create(baseList({ movieIds: [27205, 603] }));
    });
    await waitFor(() => {
      expect(result.current.getList(baseList().id)?.movieIds).toEqual([27205, 603]);
    });
    await act(async () => {
      await result.current.removeMovie(baseList().id, 27205);
    });
    await waitFor(() => {
      expect(result.current.getList(baseList().id)?.movieIds).toEqual([603]);
    });
  });

  it('rolls the cache back when the create mutation throws', async () => {
    await setRepository();
    repository.shouldFail = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await act(async () => {
      await expect(result.current.create(baseList())).rejects.toThrow('storage failure');
    });
    await waitFor(() => {
      expect(result.current.lists).toEqual([]);
    });
    expect(result.current.getList(baseList().id)).toBeUndefined();
    consoleError.mockRestore();
  });

  it('rolls the cache back when addMovie throws', async () => {
    await setRepository();
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await act(async () => {
      await result.current.create(baseList());
    });
    await waitFor(() => {
      expect(result.current.getList(baseList().id)).toBeDefined();
    });
    repository.shouldFail = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => {
      await expect(result.current.addMovie(baseList().id, 27205)).rejects.toThrow(
        'storage failure',
      );
    });
    expect(result.current.getList(baseList().id)?.movieIds).toEqual([]);
    consoleError.mockRestore();
  });

  it('remove optimistically drops the list and resolves', async () => {
    await setRepository();
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await act(async () => {
      await result.current.create(baseList());
    });
    await waitFor(() => {
      expect(result.current.lists.length).toBe(1);
    });
    await act(async () => {
      await result.current.remove(baseList().id);
    });
    await waitFor(() => {
      expect(result.current.lists).toEqual([]);
    });
  });

  it('update optimistically replaces the list in place and resolves', async () => {
    await setRepository();
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await act(async () => {
      await result.current.create(baseList());
    });
    await waitFor(() => {
      expect(result.current.getList(baseList().id)).toBeDefined();
    });
    await act(async () => {
      await result.current.update(baseList({ name: 'Renamed' }));
    });
    await waitFor(() => {
      expect(result.current.getList(baseList().id)?.name).toBe('Renamed');
    });
  });

  it('update is a no-op when the list does not exist in the cache', async () => {
    await setRepository();
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    // No create — the cache is empty.
    let updated: List | undefined;
    await act(async () => {
      updated = await result.current.update(baseList({ name: 'Should not appear' }));
    });
    expect(updated).toBeUndefined();
    expect(result.current.lists).toEqual([]);
    expect(result.current.getList(baseList().id)).toBeUndefined();
  });

  it('rolls the cache back when removeMovie throws', async () => {
    await setRepository();
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await act(async () => {
      await result.current.create(baseList({ movieIds: [27205] }));
    });
    await waitFor(() => {
      expect(result.current.getList(baseList().id)?.movieIds).toEqual([27205]);
    });
    repository.shouldFail = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => {
      await expect(result.current.removeMovie(baseList().id, 27205)).rejects.toThrow(
        'storage failure',
      );
    });
    expect(result.current.getList(baseList().id)?.movieIds).toEqual([27205]);
    consoleError.mockRestore();
  });

  it('rolls the cache back when update throws', async () => {
    await setRepository();
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await act(async () => {
      await result.current.create(baseList());
    });
    await waitFor(() => {
      expect(result.current.getList(baseList().id)).toBeDefined();
    });
    repository.shouldFail = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => {
      await expect(result.current.update(baseList({ name: 'Renamed' }))).rejects.toThrow(
        'storage failure',
      );
    });
    expect(result.current.getList(baseList().id)?.name).toBe('90s noir');
    consoleError.mockRestore();
  });

  it('rolls the cache back when remove throws', async () => {
    await setRepository();
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await act(async () => {
      await result.current.create(baseList());
    });
    await waitFor(() => {
      expect(result.current.lists.length).toBe(1);
    });
    repository.shouldFail = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => {
      await expect(result.current.remove(baseList().id)).rejects.toThrow('storage failure');
    });
    expect(result.current.lists.length).toBe(1);
    expect(result.current.getList(baseList().id)).toBeDefined();
    consoleError.mockRestore();
  });

  it('exposes the in-flight state of every mutation', async () => {
    await setRepository();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    repository.create = (list) =>
      gate.then(
        () =>
          new Promise<Lists>((resolve) => {
            repository.store = [...repository.store, list];
            resolve({ lists: repository.store });
          }),
      );
    await setRepository();
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    let promise: Promise<List> | null = null;
    act(() => {
      promise = result.current.create(baseList());
    });
    await waitFor(() => {
      expect(result.current.isCreating).toBe(true);
    });
    release();
    await act(async () => {
      await promise;
    });
    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });
  });
});
