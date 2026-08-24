/**
 * formatRatingAverage — locale-aware rating value for display.
 *
 *   - `formatRatingAverage(8.4, 'en-US')` → `"8.4"`
 *   - `formatRatingAverage(8.4, 'de-DE')` → `"8,4"`
 *   - `formatRatingAverage(8.4, 'es-CO')` → `"8,4"`
 *
 * `Intl.NumberFormat` is configured with `minimumFractionDigits: 1`
 * and `maximumFractionDigits: 1` so the output always carries
 * one decimal — matching the previous `Number.prototype.toFixed(1)`
 * behaviour — while the decimal separator follows the locale.
 *
 * @see Cineteca.md — "El formateo no se escribe a mano".
 */

const DEFAULT_LOCALE = 'en-US';

const OPTIONS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
};

export function formatRatingAverage(average: number, locale: string = DEFAULT_LOCALE): string {
  try {
    return new Intl.NumberFormat(locale, OPTIONS).format(average);
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, OPTIONS).format(average);
  }
}
