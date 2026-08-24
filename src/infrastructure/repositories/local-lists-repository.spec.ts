// infrastructure/repositories/local-lists-repository.spec.ts
//
// Verifies the four behaviours the issue calls out:
//
//   1. The repository validates data on read and discards
//      corrupted data without crashing.
//   2. Create / update / remove mutate the collection
//      atomically.
//   3. addMovie and removeMovie are idempotent (no-op when
//      the movie is already / not yet in the list).
//   4. addMovie and removeMovie throw `ListNotFoundError`
//      when the list id does not exist.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListNotFoundError } from '@/application/ports/lists-repository';
import { type StoragePort, type StorageReadResult } from '@/application/ports/storage';
import { type List } from '@/domain/lists/list';
import { LocalListsRepository } from './local-lists-repository';

class InMemoryStorage implements StoragePort {
  private store = new Map<string, string>();
  read(key: string): StorageReadResult {
    const value = this.store.get(key);
    if (value === undefined) return { kind: 'absent' };
    return { kind: 'present', value };
  }
  write(key: string, value: string): void {
    if (value === '') this.store.delete(key);
    else this.store.set(key, value);
  }
  remove(key: string): void {
    this.store.delete(key);
  }
  raw(key: string): string | null {
    return this.store.get(key) ?? null;
  }
}

const baseList = (overrides: Partial<List> = {}): List => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: '90s noir',
  description: 'A short list.',
  movieIds: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('LocalListsRepository', () => {
  let storage: InMemoryStorage;
  let repo: LocalListsRepository;

  beforeEach(() => {
    storage = new InMemoryStorage();
    repo = new LocalListsRepository(storage);
  });

  describe('read', () => {
    it('returns an empty collection when storage is empty', async () => {
      const result = await repo.read();
      expect(result.lists).toEqual([]);
    });

    it('returns the saved lists on read', async () => {
      await repo.create(baseList());
      const result = await repo.read();
      expect(result.lists.length).toBe(1);
      expect(result.lists[0]?.id).toBe('11111111-1111-4111-8111-111111111111');
    });
  });

  describe('mutations', () => {
    it('create persists a new list', async () => {
      const result = await repo.create(baseList());
      expect(result.lists.length).toBe(1);
      const raw = storage.raw('cineteca:lists:v1');
      expect(raw).not.toBeNull();
    });

    it('create replaces a list with the same id', async () => {
      await repo.create(baseList());
      await repo.create(baseList({ name: '90s noir (re-edited)' }));
      const result = await repo.read();
      expect(result.lists.length).toBe(1);
      expect(result.lists[0]?.name).toBe('90s noir (re-edited)');
    });

    it('update is a no-op when the list does not exist', async () => {
      // Per the port contract, `update` does not upsert: a missing
      // id stays missing. The caller is expected to `create` the
      // list first. The current collection is returned unchanged.
      const result = await repo.update(baseList({ id: '22222222-2222-4222-8222-222222222222' }));
      expect(result.lists).toEqual([]);
    });

    it('update is a no-op against an existing collection without modifying it', async () => {
      await repo.create(baseList());
      const result = await repo.update(
        baseList({ id: '22222222-2222-4222-8222-222222222222', name: 'Should not appear' }),
      );
      expect(result.lists.length).toBe(1);
      expect(result.lists[0]?.name).toBe('90s noir');
    });

    it('update bumps updatedAt on the matched list', async () => {
      await repo.create(baseList());
      await new Promise((r) => setTimeout(r, 5));
      const result = await repo.update(baseList({ name: 'New name' }));
      expect(result.lists[0]?.name).toBe('New name');
      expect(result.lists[0]?.updatedAt).not.toBe(baseList().updatedAt);
    });

    it('remove deletes a list by id', async () => {
      await repo.create(baseList());
      await repo.remove(baseList().id);
      const result = await repo.read();
      expect(result.lists).toEqual([]);
    });

    it('remove is a no-op when the id is not present', async () => {
      await repo.create(baseList());
      await repo.remove('not-a-real-id');
      const result = await repo.read();
      expect(result.lists.length).toBe(1);
    });
  });

  describe('addMovie / removeMovie', () => {
    it('appends a movie id to the list', async () => {
      await repo.create(baseList());
      const result = await repo.addMovie(baseList().id, 27205);
      expect(result.lists[0]?.movieIds).toEqual([27205]);
    });

    it('addMovie is a no-op when the movie is already in the list', async () => {
      await repo.create(baseList({ movieIds: [27205] }));
      const first = await repo.addMovie(baseList().id, 27205);
      expect(first.lists[0]?.movieIds).toEqual([27205]);
    });

    it('addMovie throws ListNotFoundError when the list does not exist', async () => {
      await expect(repo.addMovie('not-a-real-id', 27205)).rejects.toBeInstanceOf(ListNotFoundError);
    });

    it('removeMovie deletes the movie id from the list', async () => {
      await repo.create(baseList({ movieIds: [27205, 603] }));
      const result = await repo.removeMovie(baseList().id, 27205);
      expect(result.lists[0]?.movieIds).toEqual([603]);
    });

    it('removeMovie is a no-op when the movie is not in the list', async () => {
      await repo.create(baseList({ movieIds: [27205] }));
      const result = await repo.removeMovie(baseList().id, 603);
      expect(result.lists[0]?.movieIds).toEqual([27205]);
    });

    it('removeMovie throws ListNotFoundError when the list does not exist', async () => {
      await expect(repo.removeMovie('not-a-real-id', 27205)).rejects.toBeInstanceOf(
        ListNotFoundError,
      );
    });
  });

  describe('corrupted data on read', () => {
    it('returns an empty collection and clears the slot when JSON is malformed', async () => {
      storage.write('cineteca:lists:v1', '{not json');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { lists, corrupted } = await repo.readWithDiagnostics();
      expect(lists.lists).toEqual([]);
      expect(corrupted).toBe(true);
      expect(warn).toHaveBeenCalled();
      expect(storage.raw('cineteca:lists:v1')).toBeNull();
      warn.mockRestore();
    });

    it('returns an empty collection and clears the slot when JSON is the wrong shape', async () => {
      storage.write(
        'cineteca:lists:v1',
        JSON.stringify([{ id: 'not-a-uuid', name: 'oops', movieIds: [] }]),
      );
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { lists, corrupted } = await repo.readWithDiagnostics();
      expect(lists.lists).toEqual([]);
      expect(corrupted).toBe(true);
      expect(warn).toHaveBeenCalled();
      expect(storage.raw('cineteca:lists:v1')).toBeNull();
      warn.mockRestore();
    });

    it('returns the lists and sets `corrupted = false` when the data is valid', async () => {
      await repo.create(baseList());
      const { lists, corrupted } = await repo.readWithDiagnostics();
      expect(lists.lists.length).toBe(1);
      expect(corrupted).toBe(false);
    });
  });
});
