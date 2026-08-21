/**
 * Money — integer amount in the smallest currency unit + currency code.
 *
 * Two rules:
 *  1. No plain number for money. Functions in the domain accept `Money`,
 *     not `number`. A caller passing a raw integer gets a type error.
 *  2. The amount is in the smallest unit (cents for USD, yen for JPY,
 *     thousandths for KWD). Floating-point decimal arithmetic loses
 *     cents; integer arithmetic does not.
 *
 * The `amount` field is `readonly` so a `Money` value is immutable.
 *
 * @see Cineteca.md — "El dinero, en enteros".
 * @see docs/architecture.md — "Money as integers".
 */

import { iso4217, type ISO4217 } from './iso-4217';

export interface Money {
  readonly amount: number;
  readonly currency: ISO4217;
}

/**
 * Build money from the smallest currency unit. Throws if the amount
 * is not an integer — a fractional amount would mean the caller is
 * confusing major and minor units, and the bug is silent at runtime.
 */
export function money(amount: number, currency: ISO4217): Money {
  if (!Number.isInteger(amount)) {
    throw new Error(
      `Money amount must be an integer in the smallest currency unit (got ${String(amount)}). ` +
        'Use moneyFromMajor to convert from a decimal.',
    );
  }
  return { amount, currency };
}

/**
 * Standard minor-unit exponents for currencies that don't use two
 * decimal places. Anything not listed is treated as two-decimal.
 *
 * Source: ISO 4217. TMDB reports in USD almost exclusively, but the
 * table is here so a non-USD entry doesn't silently render wrong.
 */
const MINOR_UNIT_EXPONENT: Readonly<Record<string, number>> = {
  // Zero-decimal currencies (smallest unit == major unit).
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  // Three-decimal currencies (smallest unit == thousandth).
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
};

export function minorUnitExponent(currency: ISO4217): number {
  return MINOR_UNIT_EXPONENT[currency] ?? 2;
}

/**
 * Build money from a major-unit decimal (e.g. `63_000_000` dollars).
 * Rounds to the smallest unit using the currency's exponent.
 *
 * Useful at the validation edge: TMDB reports budgets in dollars,
 * the domain stores them as cents.
 */
export function moneyFromMajor(amount: number, currency: ISO4217): Money {
  const exponent = minorUnitExponent(currency);
  const smallest = Math.round(amount * 10 ** exponent);
  return money(smallest, currency);
}

/**
 * Parse a TMDB-style integer string into Money. TMDB returns budgets
 * and revenues as JSON numbers (sometimes strings, depending on the
 * endpoint), always in the major unit. Treats `0` and the empty string
 * as "no data" — the caller is expected to use `NoData<Money>` and
 * only call this when the field is actually present.
 *
 * For non-USD currencies this is approximate; TMDB does not tell us
 * the original currency for budget/revenue fields, so we keep USD
 * as the default and let the caller override it.
 */
export function moneyFromTMDB(raw: string | number, currency: ISO4217 = iso4217('USD')): Money {
  const major = typeof raw === 'string' ? Number.parseFloat(raw) : raw;
  if (!Number.isFinite(major)) {
    throw new Error(`Cannot parse TMDB money value: ${String(raw)}`);
  }
  return moneyFromMajor(major, currency);
}
