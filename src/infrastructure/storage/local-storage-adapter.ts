/**
 * localStorage adapter — the only place in the codebase that
 * knows the `window.localStorage` API.
 *
 * The adapter is intentionally thin: it translates the browser
 * exception shapes into a `StorageError` discriminated by `kind`
 * so the caller can decide what to do (retry, fall back to an
 * in-memory store, surface a banner, etc.). The adapter never
 * parses or shapes the stored value — that is the
 * repository's job, sitting one layer up.
 *
 * Tests cover every branch:
 *  - `read` on an absent key returns `absent`.
 *  - `read` on a present key returns `present` with the value.
 *  - `read`/`write`/`remove` when storage is disabled throw
 *    `StorageError` with the right `kind`.
 *  - `write` of an empty string removes the key.
 *  - `write` of a non-stringable value throws a `StorageError`.
 *  - `remove` is idempotent on a missing key.
 *
 * @see Cineteca.md — "El almacenamiento es un borde no confiable."
 */

import {
  StorageError,
  type StoragePort,
  type StorageReadResult,
} from '@/application/ports/storage';

const ABSENT: StorageReadResult = { kind: 'absent' } as const;

function isStorageAvailable(): boolean {
  try {
    const probe = '__cineteca_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export class LocalStorageUnavailableError extends StorageError {
  constructor() {
    super('unavailable', 'localStorage is not available in this environment.');
  }
}

export class LocalStorageQuotaError extends StorageError {
  constructor(message: string) {
    super('quota', message);
  }
}

export class LocalStoragePermissionError extends StorageError {
  constructor(message: string) {
    super('permission', message);
  }
}

export class LocalStorageAdapter implements StoragePort {
  private readonly available: boolean;

  constructor(available: boolean = isStorageAvailable()) {
    this.available = available;
  }

  read(key: string): StorageReadResult {
    if (!this.available) throw new LocalStorageUnavailableError();
    try {
      const value = window.localStorage.getItem(key);
      if (value === null) return ABSENT;
      return { kind: 'present', value };
    } catch (error: unknown) {
      throw new LocalStoragePermissionError(extractMessage(error));
    }
  }

  write(key: string, value: string): void {
    if (!this.available) throw new LocalStorageUnavailableError();
    if (typeof value !== 'string') {
      throw new LocalStoragePermissionError(`Cannot persist a non-string value at "${key}".`);
    }
    try {
      if (value === '') {
        window.localStorage.removeItem(key);
        return;
      }
      window.localStorage.setItem(key, value);
    } catch (error: unknown) {
      if (isQuotaError(error)) {
        throw new LocalStorageQuotaError(extractMessage(error));
      }
      throw new LocalStoragePermissionError(extractMessage(error));
    }
  }

  remove(key: string): void {
    if (!this.available) throw new LocalStorageUnavailableError();
    try {
      window.localStorage.removeItem(key);
    } catch (error: unknown) {
      throw new LocalStoragePermissionError(extractMessage(error));
    }
  }
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // The browser's quota-exceeded exception is named
  // `QuotaExceededError`; some browsers raise a
  // `DOMException` with the same name. Checking both names
  // keeps the adapter portable.
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    (error as { readonly code?: number }).code === 22 ||
    (error as { readonly code?: number }).code === 1014
  );
}
