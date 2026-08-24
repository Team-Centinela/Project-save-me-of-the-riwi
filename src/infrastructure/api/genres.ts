/**
 * /genre/movie/list endpoint — the catalogue of movie genres for filters.
 *
 * Translates TMDB's `{ genres: [{ id, name }, …] }` into a typed
 * domain `Genre[]`. The list is small enough that the API call
 * happens at most once per filter screen; the UI is expected to
 * wrap it in the TanStack Query cache (this module has no opinion
 * on caching — that lives in the application layer).
 *
 * @see Cineteca.md — "Catálogo de géneros para los filtros".
 */

import { z } from 'zod';
import { tmdbHttpClient } from '@/infrastructure/http/client';
import { parseWith } from './_shared';
import type { Genre } from '@/domain/movie/genre';

const genreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const genresResponseSchema = z.object({
  genres: z.array(genreSchema),
});

type GenresResponse = z.infer<typeof genresResponseSchema>;

function toGenres(raw: GenresResponse): readonly Genre[] {
  return raw.genres.map((g) => ({ id: g.id, name: g.name }));
}

/**
 * Fetches the movie genres from TMDB and returns them as domain
 * `Genre` objects. The list is unordered by TMDB's contract; the
 * UI is responsible for sorting and translation.
 */
export function getMovieGenres(): Promise<readonly Genre[]> {
  return tmdbHttpClient
    .get<unknown>('/3/genre/movie/list')
    .then((data) => parseWith(genresResponseSchema, data, '/3/genre/movie/list'))
    .then(toGenres);
}
