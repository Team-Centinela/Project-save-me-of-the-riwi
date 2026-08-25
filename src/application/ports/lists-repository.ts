/**
 * ListsRepository port — the application defines what it needs
 * to save, read, and mutate the user's themed movie lists; the
 * infrastructure provides the implementation.
 *
 * The port returns a `Lists` (a plain array of `List`) on every
 * call. The repository's job is to translate the raw, untrusted
 * storage value into a typed array — the application never
 * touches the storage string. Returning a typed array also keeps
 * the hook layer small: `useLists()` calls one `read()` and gets
 * back a domain object.
 *
 * Mutation model, on purpose:
 *
 *   - `create` / `update` / `remove` operate on whole lists and
 *     return the new collection. The hook layer updates its cache
 *     from the returned array.
 *
 *   - `addMovie` and `removeMovie` operate on a list by id. The
 *     movie id is appended to the end of `movieIds` (so the order
 *     the user added them survives a reload) and removed in place
 *     (no compaction). The function returns the new collection.
 *
 *   - All writes are idempotent. Re-creating a list with the same
 *     id replaces it. Re-adding a movie that is already in the
 *     list is a no-op. Removing a movie that is not in the list
 *     is a no-op.
 *
 * @see Cineteca.md — "El estado de la vista vive en la URL; el
 *                     estado del servidor vive en la caché."
 */

import { type List } from '@/domain/lists/list';

export interface Lists {
  readonly lists: readonly List[];
}

export class ListsCorruptedError extends Error {
  readonly key: string;
  override readonly cause: unknown;
  constructor(key: string, cause: unknown) {
    super(`Lists at "${key}" failed validation and were discarded.`);
    this.name = 'ListsCorruptedError';
    this.key = key;
    this.cause = cause;
  }
}

export class ListNotFoundError extends Error {
  readonly id: string;
  constructor(id: string) {
    super(`List "${id}" was not found.`);
    this.name = 'ListNotFoundError';
    this.id = id;
  }
}

export interface ListsRepository {
  /** Read all the lists. Corrupted data is discarded and logged;
   *  the function returns an empty collection rather than
   *  throwing. Callers that need to know about the corruption
   *  use the `readWithDiagnostics` variant below. */
  read(): Promise<Lists>;

  /** Read all the lists and return the corruption outcome so the
   *  hook layer can surface a one-time banner. */
  readWithDiagnostics(): Promise<{
    readonly lists: Lists;
    readonly corrupted: boolean;
  }>;

  /** Create a new list. Implementations may de-duplicate by `id`. */
  create(list: List): Promise<Lists>;

  /** Update an existing list. No-op if the list is not present. */
  update(list: List): Promise<Lists>;

  /** Remove a list by id. No-op if not present. */
  remove(id: string): Promise<Lists>;

  /** Append a movie id to the list. No-op if the movie is already
   *  in the list. The implementation throws `ListNotFoundError`
   *  if the list does not exist. */
  addMovie(listId: string, movieId: number): Promise<Lists>;

  /** Remove a movie id from the list. No-op if the movie is not
   *  in the list. The implementation throws `ListNotFoundError`
   *  if the list does not exist. */
  removeMovie(listId: string, movieId: number): Promise<Lists>;
}
