/**
 * Trailer — a video clip hosted on a third-party site.
 *
 * TMDB aggregates metadata for videos hosted on YouTube, Vimeo, and
 * a handful of others; only `site === 'YouTube'` is rendered by
 * Cineteca today, but the field stays open-ended in the type so a
 * new host does not need a code change.
 *
 * The `id` from TMDB is a string (Mongo-style hex), not a number —
 * differs from movie and people ids.
 *
 * @see Cineteca.md — "El parámetro de expansión".
 */
export interface Trailer {
  readonly id: string;
  readonly key: string;
  readonly site: string;
  readonly type: string;
  readonly name: string;
}
