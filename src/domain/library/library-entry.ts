/**
 * LibraryEntry — a movie saved in the user's local library.
 *
 * A `LibraryEntry` carries the minimum needed to render a card in
 * the "My Cineteca" list without re-fetching from TMDB. The full
 * `MovieSummary` is reconstructed from the entry on demand by
 * `entryToMovieSummary` (see below). Reconstructing means a
 * library saved with a future schema version can still be
 * rendered with the current code, and a corrupt field in the
 * extended data does not poison the entry's display.
 *
 * The schema lives next to the type because every read goes
 * through the same parser; the type and the parser must agree.
 *
 * @see Cineteca.md — "El estado de la vista vive en la URL; el
 *                     estado del servidor vive en la caché."
 */

import { z } from 'zod';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { released, unreleased, unknownMovieState } from '@/domain/movie/movie-state';
import { ratingReliability } from '@/domain/rating/rating-reliability';
import { absent, present } from '@/domain/shared/no-data';

const nullableString = z.union([z.string(), z.null()]).transform((v) => v ?? '');

/** Zod schema for a library entry. Every field is required but
 *  every nullable is collapsed to a sensible default so a
 *  storage migration does not poison the rest of the entry. */
export const libraryEntrySchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  originalTitle: z.string().min(1),
  overview: z.string(),
  releaseDate: nullableString,
  releaseYear: z
    .number()
    .int()
    .min(1870)
    .max(2200)
    .nullable()
    .transform((v) => v ?? null),
  posterPath: z.string(),
  backdropPath: z.string(),
  voteAverage: z.number().min(0).max(10),
  voteCount: z.number().int().min(0),
  genreIds: z.array(z.number().int().positive()),
  savedAt: z.iso.datetime(),
});

export type LibraryEntry = z.infer<typeof libraryEntrySchema>;

/** The full library is an ordered list of entries. New entries
 *  append to the end; the UI reverses the list on render. */
export const librarySchema = z.array(libraryEntrySchema);

/** Build a `MovieSummary` from a library entry. The mapping
 *  follows the same domain rules as the API-edge mapper
 *  (`toMovieSummary`): `release_date` empty → `unknown` state;
 *  `vote_count === 0` → `unknown` rating. */
export function entryToMovieSummary(entry: LibraryEntry): MovieSummary {
  const now = new Date();
  const state =
    entry.releaseYear === null
      ? unknownMovieState()
      : (() => {
          // We have a year but no full date in the entry; the
          // mapper would build a date from `release_date` (which
          // may be empty in the entry). We reuse the year as the
          // only signal we have. The schema constrains the
          // year to 1870–2200, so `Date.UTC` always produces
          // a valid date here.
          const parsed = new Date(Date.UTC(entry.releaseYear, 0, 1));
          return parsed.getTime() > now.getTime() ? unreleased(parsed) : released(parsed);
        })();
  const rating = ratingReliability(entry.voteCount, entry.voteAverage);
  return {
    id: entry.id,
    title: entry.title,
    overview: entry.overview,
    posterPath: entry.posterPath === '' ? absent<string>() : present(entry.posterPath),
    backdropPath: entry.backdropPath === '' ? absent<string>() : present(entry.backdropPath),
    state,
    rating,
    genreIds: entry.genreIds,
  };
}
