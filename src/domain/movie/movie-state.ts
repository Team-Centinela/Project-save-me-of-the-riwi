/**
 * MovieState — the lifecycle of a movie as a discriminated union.
 *
 * Each branch carries exactly the data it has. There is no nullable
 * `releaseDate: Date | null` shared across the union: a released movie
 * has a `releaseDate`, an unreleased one has an `expectedReleaseDate`,
 * and an unknown one has neither.
 *
 * A `switch` over the union with an unreachable default forces every
 * consumer to handle every variant — adding a new state makes the
 * compiler tell you which screens forgot it.
 *
 * @see Cineteca.md — "Los estados, como conjuntos cerrados de variantes".
 * @see docs/architecture.md — "States as discriminated unions".
 */

export type MovieState =
  | { readonly kind: 'released'; readonly releaseDate: Date }
  | { readonly kind: 'unreleased'; readonly expectedReleaseDate: Date }
  | { readonly kind: 'unknown' };

export const released = (releaseDate: Date): MovieState => ({
  kind: 'released',
  releaseDate,
});

export const unreleased = (expectedReleaseDate: Date): MovieState => ({
  kind: 'unreleased',
  expectedReleaseDate,
});

export const unknownMovieState = (): MovieState => ({ kind: 'unknown' });

export const isReleased = (
  state: MovieState,
): state is { readonly kind: 'released'; readonly releaseDate: Date } => state.kind === 'released';

export const isUnreleased = (
  state: MovieState,
): state is { readonly kind: 'unreleased'; readonly expectedReleaseDate: Date } =>
  state.kind === 'unreleased';

export const isUnknownMovieState = (state: MovieState): state is { readonly kind: 'unknown' } =>
  state.kind === 'unknown';

/**
 * Exhaustive fold over MovieState. The unreachable `never` default
 * makes the compiler complain if a new variant is added without
 * updating the fold.
 */
export function matchMovieState<R>(
  state: MovieState,
  branches: {
    readonly released: (releaseDate: Date) => R;
    readonly unreleased: (expectedReleaseDate: Date) => R;
    readonly unknown: () => R;
  },
): R {
  switch (state.kind) {
    case 'released':
      return branches.released(state.releaseDate);
    case 'unreleased':
      return branches.unreleased(state.expectedReleaseDate);
    case 'unknown':
      return branches.unknown();
    default: {
      const _exhaustive: never = state;
      throw new Error(`unreachable MovieState variant: ${String(_exhaustive)}`);
    }
  }
}
