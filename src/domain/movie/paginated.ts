/**
 * PaginatedList — a page of items out of a larger collection.
 *
 * TMDB caps pagination at 500 pages and treats that as a hard limit,
 * not a soft suggestion; downstream consumers enforce it. The shape
 * matches what every paginated endpoint returns so API modules can
 * share one Zod schema.
 *
 * @see Cineteca.md — "Paginación".
 * @see docs/architecture.md — "Absences are explicit in the type".
 */
export interface PaginatedList<T> {
  readonly page: number;
  readonly results: readonly T[];
  readonly totalPages: number;
  readonly totalResults: number;
}
