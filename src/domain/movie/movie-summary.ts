import { type NoData } from '@/domain/shared/no-data';
import {
  type MovieState,
  released,
  unreleased,
  unknownMovieState,
} from '@/domain/movie/movie-state';
import { ratingReliability, type RatingReliability } from '@/domain/rating/rating-reliability';

/**
 * MovieSummary — a movie as it appears in lists and search results.
 *
 * Composes the existing domain primitives (`MovieState`,
 * `RatingReliability`, `NoData<T>`) and adds nothing. The translation
 * from TMDB to this shape happens at the validation edge in
 * `infrastructure/api/`; the domain stays free of TMDB.
 *
 * Field mapping from TMDB:
 *  - `id`               → `id`
 *  - `title`            → `title`
 *  - `overview`         → `overview` (may be empty, translated to `''`)
 *  - `poster_path`      → `posterPath` (null → `absent`)
 *  - `backdrop_path`    → `backdropPath` (null → `absent`)
 *  - `release_date`     → `state` (empty → `unknown`, past → released,
 *                          future → unreleased)
 *  - `vote_average`     → `rating.average` (only when vote_count > 0)
 *  - `vote_count`       → `rating.votes` (0 → `unknown` rating)
 *  - `genre_ids`        → `genreIds`
 *
 * @see docs/architecture.md — "States as discriminated unions".
 * @see Cineteca.md — "Estados, dinero, ausencia".
 */
export interface MovieSummary {
  readonly id: number;
  readonly title: string;
  readonly overview: string;
  readonly posterPath: NoData<string>;
  readonly backdropPath: NoData<string>;
  readonly state: MovieState;
  readonly rating: RatingReliability;
  readonly genreIds: readonly number[];
}

/**
 * Classify a release date from TMDB into a `MovieState`.
 *
 * The rule is mechanical, not a calendar lookup:
 *  - missing / empty string → `unknown`
 *  - parseable date in the future (strictly after "now") → `unreleased`
 *  - anything else (parseable in the past or present, unparseable)
 *    → `released` with the parsed date, or `unknown` if unparseable.
 *
 * "Now" is captured at the API edge, so the same input date
 * deterministically produces the same variant for a given moment.
 */
export function classifyRelease(
  rawReleaseDate: string | null | undefined,
  now: Date = new Date(),
): MovieState {
  if (typeof rawReleaseDate !== 'string' || rawReleaseDate.length === 0) {
    return unknownMovieState();
  }
  const parsed = new Date(rawReleaseDate);
  if (Number.isNaN(parsed.getTime())) {
    return unknownMovieState();
  }
  if (parsed.getTime() > now.getTime()) {
    return unreleased(parsed);
  }
  return released(parsed);
}

/**
 * Build a `RatingReliability` from a TMDB-shaped `vote_count` / `vote_average`
 * pair. Translates `vote_count === 0` to `unknown` so the type carries the
 * truth instead of leaving a meaningless "0 of 10" rating in the system.
 */
export function ratingFromVotes(voteCount: number, voteAverage: number): RatingReliability {
  return ratingReliability(voteCount, voteAverage);
}
