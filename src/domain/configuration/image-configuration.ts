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
