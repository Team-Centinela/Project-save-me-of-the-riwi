import { describe, expect, it } from 'vitest';
import { formatRatingAverage } from './rating-average';

describe('domain/format/rating-average', () => {
  it('renders one decimal in en-US', () => {
    expect(formatRatingAverage(8.4, 'en-US')).toBe('8.4');
    expect(formatRatingAverage(10, 'en-US')).toBe('10.0');
    expect(formatRatingAverage(7.456, 'en-US')).toBe('7.5');
  });

  it('uses the comma decimal separator in de-DE', () => {
    expect(formatRatingAverage(8.4, 'de-DE')).toBe('8,4');
  });

  it('uses the comma decimal separator in es-ES', () => {
    expect(formatRatingAverage(8.4, 'es-ES')).toBe('8,4');
  });

  it('rounds with the standard half-up rule', () => {
    expect(formatRatingAverage(7.45, 'en-US')).toBe('7.5');
    expect(formatRatingAverage(7.55, 'en-US')).toBe('7.6');
  });

  it('falls back to en-US when no locale is provided', () => {
    expect(formatRatingAverage(8.4)).toBe('8.4');
  });

  it('falls back to a sensible default when the locale is invalid', () => {
    // `Intl.NumberFormat` does not throw on unknown locales;
    // the runtime picks its own default (a comma-decimal
    // locale in V8). We just assert no crash and a string back.
    const out = formatRatingAverage(8.4, 'xx-YY');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  it('falls back to en-US when the locale tag is malformed', () => {
    // `Intl.NumberFormat` throws RangeError on syntactically
    // invalid tags. The catch branch keeps the function
    // crash-free.
    const out = formatRatingAverage(8.4, 'not-a-tag!!!');
    expect(out).toBe('8.4');
  });
});
