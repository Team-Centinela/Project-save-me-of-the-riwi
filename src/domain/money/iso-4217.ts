/**
 * ISO 4217 — branded currency code.
 *
 * Money in the domain is `{ amount, currency }`. The currency is a
 * three-letter ISO 4217 code (USD, EUR, JPY, …). Branded so that a
 * function expecting `ISO4217` rejects a plain `string`.
 *
 * The brand is structural, not enforced by a closed list: TMDB only
 * uses a handful of codes in practice, but a closed allow-list would
 * break the day a new one appears, and the rule "ISO 4217 = three
 * uppercase letters" is the contract everyone actually agrees on.
 *
 * @see Cineteca.md — "El dinero, en enteros".
 * @see docs/architecture.md — "Money as integers".
 */

declare const iso4217Brand: unique symbol;
export type ISO4217 = string & { readonly [iso4217Brand]: true };

const ISO_4217_RE = /^[A-Z]{3}$/;

/**
 * Build an ISO4217 from a string. Throws if the input is not three
 * uppercase letters. The runtime check is the safety net; the brand
 * is the type-system check.
 */
export function iso4217(code: string): ISO4217 {
  if (!ISO_4217_RE.test(code)) {
    throw new Error(`Invalid ISO 4217 currency code: "${code}". Expected three uppercase letters.`);
  }
  return code as ISO4217;
}

/**
 * Predicate form for guards. Returns true if the string matches the
 * ISO 4217 shape; does not throw.
 */
export const isISO4217 = (code: string): code is ISO4217 => ISO_4217_RE.test(code);
