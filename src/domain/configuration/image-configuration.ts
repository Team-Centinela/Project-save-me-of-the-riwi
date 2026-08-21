/**
 * ImageConfiguration — the size catalogue for image URLs.
 *
 * TMDB's `/configuration` endpoint hands back a list of sizes for
 * each image type (poster, backdrop, profile, still, logo). Every
 * application URL is built as
 *   `${baseUrl}/${size}${path}`
 * where `path` is what the per-resource endpoints return (e.g.
 * `/abc.jpg`).
 *
 * Keeping this shape in the domain means the UI can build URLs
 * without depending on TMDB's response layout. The
 * `secureBaseUrl` is what production uses; `baseUrl` is here only
 * to keep the contract round-trippable when reading the cached
 * response back from storage in a future issue.
 *
 * @see Cineteca.md — "Base y tamaños de imagen".
 */
export interface ImageConfiguration {
  readonly baseUrl: string;
  readonly secureBaseUrl: string;
  readonly posterSizes: readonly string[];
  readonly backdropSizes: readonly string[];
  readonly profileSizes: readonly string[];
  readonly stillSizes: readonly string[];
  readonly logoSizes: readonly string[];
}

/** The default poster size when nothing is specified. `w185` is small
 * enough to be a fast first paint but big enough to be recognisable. */
export const DEFAULT_POSTER_SIZE = 'w185';

/** The default backdrop size. `w780` matches TMDB's recommended size
 * for high-density mobile and desktop cards. */
export const DEFAULT_BACKDROP_SIZE = 'w780';

/** Build the full URL for a poster, falling back to a default size
 * when the configuration has no poster sizes (degraded path).
 * Returns `null` when the path is absent so the caller can render a
 * placeholder without branching on the empty-string form. */
export function posterUrl(
  config: ImageConfiguration,
  path: string | null,
  size: string = DEFAULT_POSTER_SIZE,
): string | null {
  if (path === null || path === '') return null;
  const sizeToUse = config.posterSizes.includes(size)
    ? size
    : (config.posterSizes[0] ?? DEFAULT_POSTER_SIZE);
  return `${config.secureBaseUrl}/${sizeToUse}${path}`;
}

/** Build the full URL for a backdrop. Same null-and-default
 * semantics as `posterUrl`. */
export function backdropUrl(
  config: ImageConfiguration,
  path: string | null,
  size: string = DEFAULT_BACKDROP_SIZE,
): string | null {
  if (path === null || path === '') return null;
  const sizeToUse = config.backdropSizes.includes(size)
    ? size
    : (config.backdropSizes[0] ?? DEFAULT_BACKDROP_SIZE);
  return `${config.secureBaseUrl}/${sizeToUse}${path}`;
}
