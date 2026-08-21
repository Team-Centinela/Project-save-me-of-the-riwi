/**
 * Storage port — the application defines how it wants to read
 * and write JSON, the infrastructure provides the implementation.
 *
 * The port is intentionally narrow: read returns either the
 * stored string (or null when the slot is empty / unavailable)
 * or a domain error when the underlying call itself fails
 * (storage quota exceeded, permission denied, etc.). The
 * adapter decides whether the string is parseable JSON; the
 * repository decides whether the parsed JSON is the right
 * shape (via Zod).
 *
 * @see Cineteca.md — "El borde es no confiable."
 */

export type StorageReadResult =
  { readonly kind: 'present'; readonly value: string } | { readonly kind: 'absent' };

export class StorageError extends Error {
  readonly kind: 'unavailable' | 'quota' | 'permission' | 'unknown';
  constructor(kind: StorageError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface StoragePort {
  /**
   * Read the stored value for `key`. The adapter returns
   * `present` with the raw string, or `absent` when the key is
   * not set. Throws `StorageError` when the underlying call
   * itself fails (storage is disabled by the browser, etc.).
   */
  read(key: string): StorageReadResult;

  /**
   * Write the `value` for `key`. Throws `StorageError` when
   * the underlying call fails. A write of an empty string
   * is treated as a clear and removes the key.
   */
  write(key: string, value: string): void;

  /**
   * Remove the entry for `key`. Idempotent: removing a missing
   * key is a no-op.
   */
  remove(key: string): void;
}
