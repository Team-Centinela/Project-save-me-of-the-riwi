/**
 * Public surface for `src/infrastructure/storage/` and the
 * library + lists repositories.
 *
 * The storage adapter is exported as a class so tests can
 * construct a fresh instance; the production code uses the
 * `libraryRepository` and `listsRepository` singletons. The
 * singletons are test-reset by `__resetLibraryRepositoryForTests`
 * and `__resetListsRepositoryForTests`, called from the vitest
 * setup so each test starts with a clean storage.
 */

import { type LibraryRepository } from '@/application/ports/library-repository';
import { type ListsRepository } from '@/application/ports/lists-repository';
import { LocalStorageAdapter } from './local-storage-adapter';
import { LocalLibraryRepository } from '@/infrastructure/repositories/local-library-repository';
import { LocalListsRepository } from '@/infrastructure/repositories/local-lists-repository';

export { LocalStorageAdapter } from './local-storage-adapter';
export {
  LocalStorageUnavailableError,
  LocalStorageQuotaError,
  LocalStoragePermissionError,
} from './local-storage-adapter';
export { LocalLibraryRepository } from '@/infrastructure/repositories/local-library-repository';
export { LocalListsRepository } from '@/infrastructure/repositories/local-lists-repository';

let libraryRepositorySingleton: LibraryRepository | undefined;
let listsRepositorySingleton: ListsRepository | undefined;

export function getLibraryRepository(): LibraryRepository {
  libraryRepositorySingleton ??= new LocalLibraryRepository(new LocalStorageAdapter());
  return libraryRepositorySingleton;
}

export function getListsRepository(): ListsRepository {
  listsRepositorySingleton ??= new LocalListsRepository(new LocalStorageAdapter());
  return listsRepositorySingleton;
}

/**
 * Test-only: drop the cached repositories so the next
 * `getLibraryRepository()` / `getListsRepository()` calls build
 * fresh ones. Each test calls this in its setup so a previous
 * test's corruption does not leak into the next.
 */
export function __resetLibraryRepositoryForTests(): void {
  libraryRepositorySingleton = undefined;
}

export function __resetListsRepositoryForTests(): void {
  listsRepositorySingleton = undefined;
}

/**
 * Test-only: install a custom repository as the singleton. The
 * hook spec uses this to swap in an in-memory implementation
 * that can throw on `save` to exercise the optimistic-rollback
 * path without monkey-patching `window.localStorage`.
 */
export function __setLibraryRepositoryForTests(repo: LibraryRepository): void {
  libraryRepositorySingleton = repo;
}

export function __setListsRepositoryForTests(repo: ListsRepository): void {
  listsRepositorySingleton = repo;
}
