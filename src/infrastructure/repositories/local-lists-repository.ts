/**
 * localStorage-backed ListsRepository.
 *
 * Mirrors `LocalLibraryRepository` on purpose so the hook layer
 * can reason about both with the same mental model:
 *
 *   1. Serialize the entire collection as a single JSON string
 *      at one storage key. Splitting per-list would multiply the
 *      surface area for corruption and make atomic writes
 *      impossible.
 *
 *   2. Validate the stored JSON on every read with the
 *      `listsSchema` Zod parser. Corrupt data is logged with
 *      `console.warn` and replaced with an empty collection — the
 *      application is left in a working state, the user can
 *      re-create their lists from the form. Per the issue: "No
 *      silent data loss — corruption is logged, not swallowed."
 *
 *   3. Expose `readWithDiagnostics` for the hook layer so it can
 *      show a one-time "your lists were reset" notice.
 *
 *   4. Mutations bump `updatedAt` on every write so the list
 *      detail page can show the "last modified" timestamp.
 *
 * The repository takes the storage port in its constructor so
 * tests can swap in an in-memory adapter and assert on the
 * corruption path without touching `window.localStorage`.
 *
 * @see Cineteca.md — "El almacenamiento es un borde no confiable."
 */

import {
  ListNotFoundError,
  type Lists,
  type ListsRepository,
} from '@/application/ports/lists-repository';
import { type StoragePort } from '@/application/ports/storage';
import { type List, listsSchema } from '@/domain/lists/list';

const STORAGE_KEY = 'cineteca:lists:v1';

function nowIso(): string {
  return new Date().toISOString();
}

function serialize(lists: readonly List[]): string {
  return JSON.stringify(lists);
}

function deserialize(raw: string): readonly List[] {
  const parsed: unknown = JSON.parse(raw);
  return listsSchema.parse(parsed);
}

export class LocalListsRepository implements ListsRepository {
  private readonly storage: StoragePort;

  constructor(storage: StoragePort) {
    this.storage = storage;
  }

  async read(): Promise<Lists> {
    const { lists } = await this.readWithDiagnostics();
    return lists;
  }

  readWithDiagnostics(): Promise<{
    readonly lists: Lists;
    readonly corrupted: boolean;
  }> {
    const result = this.storage.read(STORAGE_KEY);
    if (result.kind === 'absent') {
      return Promise.resolve({ lists: { lists: [] }, corrupted: false });
    }
    try {
      const parsed = deserialize(result.value);
      return Promise.resolve({ lists: { lists: parsed }, corrupted: false });
    } catch (cause: unknown) {
      // Per the issue: "No silent data loss — corruption is
      // logged, not swallowed." The log carries the raw value
      // (truncated) so a developer can diagnose the shape that
      // broke the parser. The user's lists are reset to an
      // empty collection and the corrupt key is removed.
      console.warn(`[cineteca] Lists at "${STORAGE_KEY}" failed validation and were discarded.`, {
        key: STORAGE_KEY,
        raw: result.value.slice(0, 256),
        cause,
      });
      try {
        this.storage.remove(STORAGE_KEY);
      } catch {
        // Best-effort: a removal failure on top of a parse
        // failure is not worth surfacing to the user; the
        // next read will try again.
      }
      return Promise.resolve({
        lists: { lists: [] },
        corrupted: true,
      });
    }
  }

  private writeAll(lists: readonly List[]): Lists {
    const next: Lists = { lists };
    this.storage.write(STORAGE_KEY, serialize(next.lists));
    return next;
  }

  async create(list: List): Promise<Lists> {
    const { lists } = await this.readWithDiagnostics();
    const without = lists.lists.filter((l) => l.id !== list.id);
    const next = [...without, { ...list, updatedAt: nowIso() }];
    return this.writeAll(next);
  }

  async update(list: List): Promise<Lists> {
    const { lists } = await this.readWithDiagnostics();
    // Per the port contract: `update` is a no-op when the list is
    // not present. The caller is expected to have created the list
    // first; a silent upsert would hide bugs (a renamed id would
    // resurrect a different list rather than update the one the
    // user expects).
    if (!lists.lists.some((l) => l.id === list.id)) {
      return { lists: lists.lists };
    }
    const next = lists.lists.map((l) => (l.id === list.id ? { ...list, updatedAt: nowIso() } : l));
    return this.writeAll(next);
  }

  async remove(id: string): Promise<Lists> {
    const { lists } = await this.readWithDiagnostics();
    const next = lists.lists.filter((l) => l.id !== id);
    return this.writeAll(next);
  }

  async addMovie(listId: string, movieId: number): Promise<Lists> {
    const { lists } = await this.readWithDiagnostics();
    const target = lists.lists.find((l) => l.id === listId);
    if (target === undefined) {
      throw new ListNotFoundError(listId);
    }
    if (target.movieIds.includes(movieId)) {
      return { lists: lists.lists };
    }
    const next = lists.lists.map((l) =>
      l.id === listId ? { ...l, movieIds: [...l.movieIds, movieId], updatedAt: nowIso() } : l,
    );
    return this.writeAll(next);
  }

  async removeMovie(listId: string, movieId: number): Promise<Lists> {
    const { lists } = await this.readWithDiagnostics();
    const target = lists.lists.find((l) => l.id === listId);
    if (target === undefined) {
      throw new ListNotFoundError(listId);
    }
    if (!target.movieIds.includes(movieId)) {
      return { lists: lists.lists };
    }
    const next = lists.lists.map((l) =>
      l.id === listId
        ? { ...l, movieIds: l.movieIds.filter((id) => id !== movieId), updatedAt: nowIso() }
        : l,
    );
    return this.writeAll(next);
  }
}

export { ListNotFoundError };
