/**
 * Public API surface for `src/infrastructure/api/`.
 *
 * Re-exports the seven endpoint modules the rest of the app
 * consumes (`configuration`, `genres`, `discover`, `search`,
 * `movie`, `recommendations`, `trending`) plus `TmdbSchemaError`,
 * the typed error a caller sees when a response shape drifted.
 * The raw-schema / mapper helpers (`./_shared`) remain internal —
 * domain types live in `src/domain/**` and should be imported
 * from there.
 *
 * @see docs/architecture.md — "Where does this file go?".
 */

export { getAppConfiguration, __resetConfigurationCacheForTests } from './configuration';
export { getMovieGenres } from './genres';
export { discoverMovies, type DiscoverFilters, type DiscoverSortOption } from './discover';
export { searchMovies, type SearchParams } from './search';
export { getMovieDetail, type MovieDetailParams } from './movie';
export { getMovieRecommendations, type MovieRecommendationsParams } from './recommendations';
export { getTrendingMovies, type TrendingParams, type TrendingTimeWindow } from './trending';
export { TmdbSchemaError } from './_shared';
