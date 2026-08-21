import { type NoData } from '@/domain/shared/no-data';
import { type Money } from '@/domain/money/money';
import { type CastMember } from '@/domain/movie/cast';
import { type Genre } from '@/domain/movie/genre';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { type Trailer } from '@/domain/movie/trailer';

/**
 * MovieDetail — the rich record behind a single movie.
 *
 * Extends `MovieSummary` with everything the detail screen needs but
 * the summary does not: tagline, runtime, resolved `Genre` objects
 * (the summary carries `genreIds` instead, to keep the response light
 * in lists), budget and revenue as `Money` integers, and the appended
 * cast and trailers.
 *
 * `cast` and `trailers` are wrapped in `NoData<readonly …[]>` so the
 * domain distinguishes "the API call did not ask for the append"
 * (translated to `absent`) from "the call asked but the movie has
 * no credits / no videos" (which the API still returns as an empty
 * array, wrapped in `present([])`). The UI can pattern-match on
 * `kind` to decide whether to render the section at all.
 *
 * The same `Money` rule as elsewhere: amount in the smallest
 * currency unit, never a raw decimal. TMDB reports budget and
 * revenue as JSON numbers in USD; the validation edge converts.
 *
 * @see docs/architecture.md — "Money as integers", "Absences are
 *      explicit in the type".
 * @see Cineteca.md — "El parámetro de expansión".
 */
export interface MovieDetail extends MovieSummary {
  readonly tagline: NoData<string>;
  readonly runtime: NoData<number>;
  readonly genres: readonly Genre[];
  readonly budget: NoData<Money>;
  readonly revenue: NoData<Money>;
  readonly cast: NoData<readonly CastMember[]>;
  readonly trailers: NoData<readonly Trailer[]>;
}
