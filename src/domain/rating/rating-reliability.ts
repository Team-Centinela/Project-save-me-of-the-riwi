/**
 * RatingReliability — how trustworthy a rating is based on its vote count.
 *
 * The shape is the same as `MovieState`: a discriminated union where each
 * branch carries the data that justifies it. `consolidated` and `early`
 * both carry the rating and the count that produced it; `unknown` carries
 * nothing (TMDB returned `0` votes, which means "I don't know").
 *
 * @see Cineteca.md — "Los estados, como conjuntos cerrados de variantes".
 * @see docs/architecture.md — "States as discriminated unions".
 */

/**
 * A rating is considered consolidated when at least this many votes
 * back it. Below the threshold, the rating is "early" — the average
 * can swing wildly with a handful of reviews.
 *
 * The number is a domain policy, not a UI knob: changing it is a
 * behavioral change that ships in a PR.
 */
export const CONSOLIDATED_VOTE_THRESHOLD = 50;

export type RatingReliability =
  | {
      readonly kind: 'consolidated';
      readonly votes: number;
      readonly average: number;
    }
  | {
      readonly kind: 'early';
      readonly votes: number;
      readonly average: number;
    }
  | { readonly kind: 'unknown' };

/**
 * Build a RatingReliability from raw TMDB values. Translates a `0` vote
 * count to `unknown` so the type system carries the truth — there is no
 * "0.0 average" inside the domain.
 */
export function ratingReliability(votes: number, average: number): RatingReliability {
  if (votes === 0) {
    return { kind: 'unknown' };
  }
  if (votes < CONSOLIDATED_VOTE_THRESHOLD) {
    return { kind: 'early', votes, average };
  }
  return { kind: 'consolidated', votes, average };
}

export const isConsolidated = (
  rating: RatingReliability,
): rating is {
  readonly kind: 'consolidated';
  readonly votes: number;
  readonly average: number;
} => rating.kind === 'consolidated';

export const isEarly = (
  rating: RatingReliability,
): rating is {
  readonly kind: 'early';
  readonly votes: number;
  readonly average: number;
} => rating.kind === 'early';

export const isUnknownRating = (
  rating: RatingReliability,
): rating is { readonly kind: 'unknown' } => rating.kind === 'unknown';

/**
 * Exhaustive fold over RatingReliability. The unreachable `never`
 * default forces every consumer to handle every variant.
 */
export function matchRatingReliability<R>(
  rating: RatingReliability,
  branches: {
    readonly consolidated: (votes: number, average: number) => R;
    readonly early: (votes: number, average: number) => R;
    readonly unknown: () => R;
  },
): R {
  switch (rating.kind) {
    case 'consolidated':
      return branches.consolidated(rating.votes, rating.average);
    case 'early':
      return branches.early(rating.votes, rating.average);
    case 'unknown':
      return branches.unknown();
    default: {
      const _exhaustive: never = rating;
      throw new Error(`unreachable RatingReliability variant: ${String(_exhaustive)}`);
    }
  }
}
