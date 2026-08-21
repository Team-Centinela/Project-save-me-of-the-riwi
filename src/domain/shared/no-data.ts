/**
 * NoData — explicit absences in the domain.
 *
 * TMDB returns `0` or empty strings for unknown data. Translating those
 * to "no data" at the validation edge keeps the type honest: inside the
 * domain, every nullable field says whether the data is there.
 *
 * No `0` that means "I don't know". No `null`. No `undefined`.
 *
 * @see Cineteca.md — "Las ausencias, explícitas en el tipo".
 * @see docs/architecture.md — "Absences are explicit in the type".
 */

export type NoData<T> =
  { readonly kind: 'absent' } | { readonly kind: 'present'; readonly value: T };

export const absent = <T = never>(): NoData<T> => ({ kind: 'absent' });
export const present = <T>(value: T): NoData<T> => ({ kind: 'present', value });

export const isAbsent = <T>(n: NoData<T>): n is { readonly kind: 'absent' } => n.kind === 'absent';

export const isPresent = <T>(n: NoData<T>): n is { readonly kind: 'present'; readonly value: T } =>
  n.kind === 'present';

/**
 * Exhaustive fold over a NoData. Forces every consumer to handle absence —
 * the compiler will complain if a new variant is added.
 */
export function matchNoData<T, R>(
  data: NoData<T>,
  branches: {
    readonly absent: () => R;
    readonly present: (value: T) => R;
  },
): R {
  switch (data.kind) {
    case 'absent':
      return branches.absent();
    case 'present':
      return branches.present(data.value);
    default: {
      const _exhaustive: never = data;
      throw new Error(`unreachable NoData variant: ${String(_exhaustive)}`);
    }
  }
}
