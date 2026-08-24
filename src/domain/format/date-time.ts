/**
 * formatDateTime — locale-aware short date + time for display.
 *
 *   - `formatDateTime('2024-08-15T13:45:00Z', 'en-US')` → `"Aug 15, 2024, 1:45 PM"`
 *   - `formatDateTime('2024-08-15T13:45:00Z', 'de-DE')` → `"15.08.2024, 13:45"`
 *   - `formatDateTime('2024-08-15T13:45:00Z', 'es-CO')` → `"15/8/2024, 13:45"`
 *
 * `Intl.DateTimeFormat` is configured with `dateStyle: 'medium'`
 * and `timeStyle: 'short'`, which delegates the actual layout
 * to the locale's CLDR data — no hand-rolled separators.
 *
 * A malformed `iso` string returns the raw input rather than
 * throwing: the UI falls back to a literal date stamp instead
 * of crashing the page.
 *
 * @see Cineteca.md — "El formateo no se escribe a mano".
 */

const DEFAULT_LOCALE = 'en-US';

const OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
};

export function formatDateTime(iso: string, locale: string = DEFAULT_LOCALE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale, OPTIONS).format(date);
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, OPTIONS).format(date);
  }
}
