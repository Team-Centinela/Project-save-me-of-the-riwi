/**
 * localStorage-backed LibraryRepository.
 *
 * Responsibilities, on purpose:
 *
 *   1. Serialize the library as a single JSON string at one
 *      storage key. Splitting per-entry would multiply the
 *      surface area for corruption and make atomic writes
 *      impossible (two writes can succeed individually and
 *      leave the library in a half-updated state).
 *
 *   2. Validate the stored JSON on every read with the
 *      `librarySchema` Zod parser. Corrupt data is logged
 *      with `console.warn` and replaced with an empty
 *      library — the application is left in a working
 *      state, the user can re-save their movies from the
 *      detail page. Per the issue: "No silent data loss —
 *      corruption is logged, not swallowed."
 *
 *   3. Expose `readWithDiagnostics` for the hook layer so it
 *      can show a one-time "your library was reset" notice.
 *
 * The repository takes the storage port in its constructor
 * so tests can swap in an in-memory adapter and assert on
 * the corruption path without touching `window.localStorage`.
 *
 * @see Cineteca.md — "El almacenamiento es un borde no confiable."
 */

import {
  LibraryCorruptedError,
  type Library,
  type LibraryRepository,
} from '@/application/ports/library-repository';
import { type StoragePort } from '@/application/ports/storage';
import { type LibraryEntry, librarySchema } from '@/domain/library/library-entry';

const STORAGE_KEY = 'cineteca:library:v1';

function nowIso(): string {
  return new Date().toISOString();
}

function serialize(library: readonly LibraryEntry[]): string {
  return JSON.stringify(library);
}

function deserialize(raw: string): readonly LibraryEntry[] {
  const parsed: unknown = JSON.parse(raw);
  return librarySchema.parse(parsed);
}

export class LocalLibraryRepository implements LibraryRepository {
  private readonly storage: StoragePort;

  constructor(storage: StoragePort) {
    this.storage = storage;
  }

  async read(): Promise<Library> {
    const { library } = await this.readWithDiagnostics();
    return library;
  }

  readWithDiagnostics(): Promise<{ readonly library: Library; readonly corrupted: boolean }> {
    const result = this.storage.read(STORAGE_KEY);
    if (result.kind === 'absent') {
      return Promise.resolve({ library: { entries: [] }, corrupted: false });
    }
    try {
      const entries = deserialize(result.value);
      return Promise.resolve({ library: { entries }, corrupted: false });
    } catch (cause: unknown) {
      // Per the issue: "No silent data loss — corruption is
      // logged, not swallowed." The log carries the raw value
      // (truncated) so a developer can diagnose the shape that
      // broke the parser. The user's library is reset to an
      // empty list and the corrupt key is removed.
      console.warn(`[cineteca] Library at "${STORAGE_KEY}" failed validation and was discarded.`, {
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
        library: { entries: [] },
        corrupted: true,
      });
    }
  }

  async save(entry: LibraryEntry): Promise<Library> {
    const { library } = await this.readWithDiagnostics();
    const without = library.entries.filter((e) => e.id !== entry.id);
    const next: LibraryEntry = { ...entry, savedAt: entry.savedAt || nowIso() };
    const nextLibrary: Library = { entries: [...without, next] };
    this.storage.write(STORAGE_KEY, serialize(nextLibrary.entries));
    return nextLibrary;
  }

  async remove(id: number): Promise<Library> {
    const { library } = await this.readWithDiagnostics();
    const nextLibrary: Library = {
      entries: library.entries.filter((e) => e.id !== id),
    };
    this.storage.write(STORAGE_KEY, serialize(nextLibrary.entries));
    return nextLibrary;
  }
}

export { LibraryCorruptedError };
