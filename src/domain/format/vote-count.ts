/**
 * formatVoteCount — locale-aware vote count for display.
 *
 *   - `formatVoteCount(30_000, 'en-US')` → `"30,000"`
 *   - `formatVoteCount(30_000, 'de-DE')` → `"30.000"`
 *   - `formatVoteCount(30_000, 'es-CO')` → `"30.000"`
 *   - `formatVoteCount(1, 'en-US')`      → `"1"`
 *
 * `Intl.NumberFormat` does the heavy lifting — thousands
 * separators, locale-specific digit shapes (Arabic numerals
 * everywhere we care about for the MVP, but the runtime knows
 * the rest). The plural suffix (`vote` / `votes`) is owned by
 * the copy module because it is user-facing text.
 *
 * The compact variant returns the same shape with the
 * `notation: 'compact'` option, producing `"30K"` / `"1.2M"`
 * labels. The compact form has no plural suffix, so it is
 * suitable for tight UIs (the grid card).
 *
 * @see Cineteca.md — "El formateo no se escribe a mano".
 */

const DEFAULT_LOCALE = 'en-US';

function formatterFor(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, options);
  }
}

export function formatVoteCount(n: number, locale: string = DEFAULT_LOCALE): string {
  return formatterFor(locale, {}).format(n);
}

export function formatVoteCountCompact(n: number, locale: string = DEFAULT_LOCALE): string {
  return formatterFor(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}
