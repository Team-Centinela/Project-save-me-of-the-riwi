/**
 * formatDuration — turn a runtime in minutes into a human label.
 *
 * Examples:
 *  - `formatDuration(0, 'en-US')`   → `"—"`         (no data)
 *  - `formatDuration(45, 'en-US')`  → `"45 min"`
 *  - `formatDuration(60, 'en-US')`  → `"1 h"`
 *  - `formatDuration(90, 'en-US')`  → `"1 h 30 min"`
 *  - `formatDuration(148, 'en-US')` → `"2 h 28 min"`
 *  - `formatDuration(148, 'de-DE')` → `"2 Std. 28 Min."` (German hours/minutes)
 *  - `formatDuration(148, 'es-CO')` → `"2 h 28 min"`     (short forms, like en)
 *
 * The `0` and negative cases return a dash so the UI can render a
 * placeholder without branching on the empty-string form. The
 * "no data" wording lives in the copy module; this domain
 * function only decides the shape.
 *
 * Issue #17 contract: durations read as `"2 h 15 min"` in es
 * and en, with the Germanic `"Std."`/`"Min."` form for `de`.
 * The numeric value is rendered through `Intl.NumberFormat`,
 * so the thousands separator follows the locale; the unit
 * ("h", "min", "Std.", "Min.") is chosen from a small map.
 *
 * @see Cineteca.md — "La duración, en enteros".
 */

const HOUR_UNIT_BY_LOCALE_GROUP: Readonly<Record<string, string>> = {
  // Germanic languages: hour = "Std." / "Uhr" — pick the short form.
  de: 'Std.',
  // Romance languages (es, fr, it, pt) tend to use "h" in short
  // labels the same way English does. Default to "h".
  es: 'h',
  fr: 'h',
  it: 'h',
  pt: 'h',
  en: 'h',
};

const MINUTE_UNIT_BY_LOCALE_GROUP: Readonly<Record<string, string>> = {
  de: 'Min.',
  es: 'min',
  fr: 'min',
  it: 'min',
  pt: 'min',
  en: 'min',
};

function pickUnit(map: Readonly<Record<string, string>>, locale: string): string {
  // The lookup is by language tag only (the part before `-`).
  // A `de-AT` user and a `de-DE` user both see the German form.
  const lang = locale.split('-')[0];
  if (lang !== undefined && lang !== '' && map[lang] !== undefined) {
    return map[lang];
  }
  // Fallback to English short forms for unknown locales.
  return map.en;
}

function pickFormatter(locale: string): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, {});
  } catch {
    // Intl.NumberFormat only throws on fundamentally broken
    // ICU data; fall back to en-US so the page never crashes.
    return new Intl.NumberFormat('en-US', {});
  }
}

export interface FormatDurationOptions {
  readonly locale?: string;
}

const DEFAULT_DURATION_LOCALE = 'en-US';

export function formatDuration(
  runtimeMinutes: number | null | undefined,
  options: FormatDurationOptions = {},
): string {
  if (runtimeMinutes === null || runtimeMinutes === undefined) return '—';
  if (!Number.isFinite(runtimeMinutes) || runtimeMinutes < 0) return '—';

  const locale = options.locale ?? DEFAULT_DURATION_LOCALE;
  const numberFormatter = pickFormatter(locale);
  const totalMinutes = Math.round(runtimeMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const hourUnit = pickUnit(HOUR_UNIT_BY_LOCALE_GROUP, locale);
  const minuteUnit = pickUnit(MINUTE_UNIT_BY_LOCALE_GROUP, locale);

  if (hours === 0 && minutes === 0) return '—';
  if (hours === 0) return `${numberFormatter.format(minutes)} ${minuteUnit}`;
  if (minutes === 0) return `${numberFormatter.format(hours)} ${hourUnit}`;
  return `${numberFormatter.format(hours)} ${hourUnit} ${numberFormatter.format(minutes)} ${minuteUnit}`;
}
