// infrastructure/repositories/local-library-repository.spec.ts
//
// Verifies the four behaviours the issue calls out:
//
//   1. The repository validates data on read and discards
//      corrupted data without crashing.
//   2. Save persists the entry.
//   3. Remove deletes the entry by id.
//   4. Save is idempotent in the sense that re-saving the
//      same id updates the existing entry rather than
//      duplicating it.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type StoragePort, type StorageReadResult } from '@/application/ports/storage';
import { type LibraryEntry } from '@/domain/library/library-entry';
import { LocalLibraryRepository } from './local-library-repository';

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
  // Test helpers
  raw(key: string): string | null {
    return this.store.get(key) ?? null;
  }
}

const baseEntry = (overrides: Partial<LibraryEntry> = {}): LibraryEntry => ({
  id: 27205,
  title: 'Inception',
  originalTitle: 'Inception',
  overview: 'A thief who steals corporate secrets.',
  releaseDate: '2010-07-16',
  releaseYear: 2010,
  posterPath: '/abc.jpg',
  backdropPath: '/bd.jpg',
  voteAverage: 8.4,
  voteCount: 30_000,
  genreIds: [28, 12, 878],
  savedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('LocalLibraryRepository', () => {
  let storage: InMemoryStorage;
  let repo: LocalLibraryRepository;

  beforeEach(() => {
    storage = new InMemoryStorage();
    repo = new LocalLibraryRepository(storage);
  });

  it('returns an empty library when storage is empty', async () => {
    const result = await repo.read();
    expect(result.entries).toEqual([]);
  });

  it('returns a saved entry on read', async () => {
    await repo.save(baseEntry());
    const result = await repo.read();
    expect(result.entries.length).toBe(1);
    expect(result.entries[0]?.id).toBe(27205);
  });

  it('removes an entry by id', async () => {
    await repo.save(baseEntry());
    await repo.remove(27205);
    const result = await repo.read();
    expect(result.entries).toEqual([]);
  });

  it('re-saving the same id updates the entry in place', async () => {
    await repo.save(baseEntry());
    await repo.save(baseEntry({ title: 'Inception (re-release)' }));
    const result = await repo.read();
    expect(result.entries.length).toBe(1);
    expect(result.entries[0]?.title).toBe('Inception (re-release)');
  });

  it('preserves the savedAt of an existing entry on re-save', async () => {
    await repo.save(baseEntry({ savedAt: '2024-01-01T00:00:00.000Z' }));
    await repo.save(baseEntry({ title: 'Inception v2' }));
    const result = await repo.read();
    expect(result.entries[0]?.savedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  describe('corrupted data on read', () => {
    it('returns an empty library and clears the storage slot when JSON is malformed', async () => {
      storage.write('cineteca:library:v1', '{not json');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { library, corrupted } = await repo.readWithDiagnostics();
      expect(library.entries).toEqual([]);
      expect(corrupted).toBe(true);
      expect(warn).toHaveBeenCalled();
      expect(storage.raw('cineteca:library:v1')).toBeNull();
      warn.mockRestore();
    });

    it('returns an empty library and clears the slot when JSON is the wrong shape', async () => {
      storage.write('cineteca:library:v1', JSON.stringify([{ id: 'not-a-number', title: 'oops' }]));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { library, corrupted } = await repo.readWithDiagnostics();
      expect(library.entries).toEqual([]);
      expect(corrupted).toBe(true);
      expect(warn).toHaveBeenCalled();
      expect(storage.raw('cineteca:library:v1')).toBeNull();
      warn.mockRestore();
    });

    it('returns the library and sets `corrupted = false` when the data is valid', async () => {
      await repo.save(baseEntry());
      const { library, corrupted } = await repo.readWithDiagnostics();
      expect(library.entries.length).toBe(1);
      expect(corrupted).toBe(false);
    });
  });
});
