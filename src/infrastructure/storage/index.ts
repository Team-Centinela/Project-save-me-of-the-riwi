/**
 * Public surface for `src/infrastructure/storage/` and the
 * library repository.
 *
 * The storage adapter is exported as a class so tests can
 * construct a fresh instance; the production code uses the
 * `libraryRepository` singleton. The singleton is test-reset
 * by `__resetLibraryRepositoryForTests`, called from the
 * vitest setup so each test starts with a clean storage.
 */

import { type LibraryRepository } from '@/application/ports/library-repository';
import { LocalStorageAdapter } from './local-storage-adapter';
import { LocalLibraryRepository } from '@/infrastructure/repositories/local-library-repository';

export { LocalStorageAdapter } from './local-storage-adapter';
export {
  LocalStorageUnavailableError,
  LocalStorageQuotaError,
  LocalStoragePermissionError,
} from './local-storage-adapter';
export { LocalLibraryRepository } from '@/infrastructure/repositories/local-library-repository';

let repository: LibraryRepository | undefined;

export function getLibraryRepository(): LibraryRepository {
  repository ??= new LocalLibraryRepository(new LocalStorageAdapter());
  return repository;
}

/**
 * Test-only: drop the cached repository so the next
 * `getLibraryRepository()` call builds a fresh one. Each test
 * calls this in its setup so a previous test's corruption
 * does not leak into the next.
 */
export function __resetLibraryRepositoryForTests(): void {
  repository = undefined;
}

/**
 * Test-only: install a custom repository as the singleton. The
 * hook spec uses this to swap in an in-memory implementation
 * that can throw on `save` to exercise the optimistic-rollback
 * path without monkey-patching `window.localStorage`.
 */
export function __setLibraryRepositoryForTests(repo: LibraryRepository): void {
  repository = repo;
}
