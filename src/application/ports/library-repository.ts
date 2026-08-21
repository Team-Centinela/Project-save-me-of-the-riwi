/**
 * LibraryRepository port — the application defines what it
 * needs to save and read a user's local library, the
 * infrastructure provides the implementation.
 *
 * The port returns a `Library` (a plain list) on every call.
 * The repository's job is to translate the raw, untrusted
 * storage value into a typed list — the application never
 * touches the storage string. Returning a typed list also
 * keeps the hook layer small: `useLibrary()` calls one
 * `read()` and gets back a domain object.
 *
 * @see Cineteca.md — "El estado de la vista vive en la URL; el
 *                     estado del servidor vive en la caché."
 */

import { type LibraryEntry } from '@/domain/library/library-entry';

export interface Library {
  readonly entries: readonly LibraryEntry[];
}

export class LibraryCorruptedError extends Error {
  readonly key: string;
  readonly cause: unknown;
  constructor(key: string, cause: unknown) {
    super(`Library at "${key}" failed validation and was discarded.`);
    this.name = 'LibraryCorruptedError';
    this.key = key;
    this.cause = cause;
  }
}

export interface LibraryRepository {
  /** Read the full library. Corrupted data is discarded and
   *  logged; the function returns an empty list rather than
   *  throwing. Callers that need to know about the corruption
   *  use the `readRaw` variant below. */
  read(): Promise<Library>;

  /** Read the library and return the corruption outcome, so
   *  the hook layer can surface a one-time banner. */
  readWithDiagnostics(): Promise<{
    readonly library: Library;
    readonly corrupted: boolean;
  }>;

  /** Append an entry. Implementations may de-duplicate by `id`. */
  save(entry: LibraryEntry): Promise<Library>;

  /** Remove the entry with the given `id`. No-op if not present. */
  remove(id: number): Promise<Library>;
}
