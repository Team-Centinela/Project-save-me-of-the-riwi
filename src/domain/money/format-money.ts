/**
 * formatMoney — Intl-backed formatter for the Money type.
 *
 * The currency comes from data (TMDB tells us USD); the format is a
 * viewer preference (the browser's locale). Same `63_000_000 USD`
 * renders as `$63,000,000.00` in `en-US`, `63.000.000,00 $` in
 * `de-DE`, and `63 000 000,00 $US` in `fr-FR`. All three are correct
 * for the same value.
 *
 * Formatting is delegated to `Intl.NumberFormat`. A hand-written
 * thousand separator is a bug waiting for a new locale; the Intl
 * API handles the rules for every locale the runtime knows about.
 *
 * @see Cineteca.md — "El formateo no se escribe a mano".
 * @see docs/architecture.md — "Formatting is delegated".
 */

import { minorUnitExponent, type Money } from './money';

export interface FormatMoneyOptions {
  /**
   * BCP 47 locale tag. Defaults to `navigator.language` when running
   * in the browser, or `'en-US'` in Node (tests, SSR). Pass an
   * explicit locale in tests to make assertions deterministic.
   */
  readonly locale?: string;
}

/**
 * Resolve the runtime locale. Falls back to `en-US` when `navigator`
 * is not available (Node, jsdom without language, tests).
 */
function defaultLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
}

/**
 * Format a `Money` value for display.
 *
 * Examples (all formatting the same `63_000_000 USD`):
 *  - `formatMoney(m, { locale: 'en-US' })` → `"$63,000,000.00"`
 *  - `formatMoney(m, { locale: 'de-DE' })` → `"63.000.000,00 $"`
 *  - `formatMoney(m, { locale: 'fr-FR' })` → `"63 000 000,00 $US"`
 *
 * The currency is data; the locale is presentation. They are
 * deliberately separate arguments.
 */
export function formatMoney(m: Money, options: FormatMoneyOptions = {}): string {
  const locale = options.locale ?? defaultLocale();
  const exponent = minorUnitExponent(m.currency);
  const major = m.amount / 10 ** exponent;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: m.currency,
  }).format(major);
}
