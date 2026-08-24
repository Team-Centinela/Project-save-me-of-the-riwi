import { describe, expect, it } from 'vitest';
import { formatDuration } from './duration';

describe('domain/format/duration', () => {
  describe('no-data branches', () => {
    it('returns "—" for null', () => {
      expect(formatDuration(null)).toBe('—');
    });

    it('returns "—" for undefined', () => {
      expect(formatDuration(undefined)).toBe('—');
    });

    it('returns "—" for zero', () => {
      expect(formatDuration(0)).toBe('—');
    });

    it('returns "—" for a negative number', () => {
      expect(formatDuration(-5)).toBe('—');
    });

    it('returns "—" for NaN', () => {
      expect(formatDuration(Number.NaN)).toBe('—');
    });

    it('returns "—" for Infinity', () => {
      expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('—');
    });
  });

  describe('happy paths (en-US)', () => {
    it('renders the minutes-only case', () => {
      expect(formatDuration(1, { locale: 'en-US' })).toBe('1 min');
    });

    it('renders a sub-hour runtime', () => {
      expect(formatDuration(45, { locale: 'en-US' })).toBe('45 min');
    });

    it('rounds sub-minute decimals down', () => {
      expect(formatDuration(59.4, { locale: 'en-US' })).toBe('59 min');
    });

    it('rounds sub-minute decimals up', () => {
      expect(formatDuration(59.6, { locale: 'en-US' })).toBe('1 h');
    });

    it('renders the hours-only case', () => {
      expect(formatDuration(60, { locale: 'en-US' })).toBe('1 h');
      expect(formatDuration(120, { locale: 'en-US' })).toBe('2 h');
    });

    it('renders the hour-and-minute case', () => {
      expect(formatDuration(148, { locale: 'en-US' })).toBe('2 h 28 min');
    });
  });

  describe('locale variants', () => {
    it('uses the Germanic short forms for de-DE', () => {
      expect(formatDuration(148, { locale: 'de-DE' })).toBe('2 Std. 28 Min.');
    });

    it('uses the h/min short forms for es-ES', () => {
      expect(formatDuration(148, { locale: 'es-ES' })).toBe('2 h 28 min');
    });

    it('uses the h/min short forms for es-CO', () => {
      // es-CO uses the Latin American variant of Spanish. The
      // short-form unit is the same.
      expect(formatDuration(148, { locale: 'es-CO' })).toBe('2 h 28 min');
    });

    it('falls back to the en-US short forms when the locale is unknown', () => {
      expect(formatDuration(148, { locale: 'xx-YY' })).toBe('2 h 28 min');
    });
  });

  describe('rounding and locale defaults', () => {
    it('rounds half-integer minutes toward nearest (half-up)', () => {
      // `Math.round(89.5) === 90` in V8 — positive `.5` rounds up.
      // The test pins that contract so a switch to banker's
      // rounding would be a deliberate, visible change.
      expect(formatDuration(89.5, { locale: 'en-US' })).toBe('1 h 30 min');
    });

    it('falls back to en-US when no locale is provided', () => {
      expect(formatDuration(148)).toBe('2 h 28 min');
    });

    it('falls back to en-US when the locale tag is malformed', () => {
      // `Intl.NumberFormat` throws RangeError on syntactically
      // invalid tags. The catch branch in `pickFormatter`
      // keeps the function crash-free.
      const out = formatDuration(148, { locale: 'not-a-tag!!!' });
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(0);
    });
  });
});
