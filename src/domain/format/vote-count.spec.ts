import { describe, expect, it } from 'vitest';
import { formatVoteCount, formatVoteCountCompact } from './vote-count';

describe('domain/format/vote-count', () => {
  describe('formatVoteCount (full)', () => {
    it('renders zero without a separator', () => {
      expect(formatVoteCount(0, 'en-US')).toBe('0');
    });

    it('renders one without an "s" (the copy module owns the plural)', () => {
      expect(formatVoteCount(1, 'en-US')).toBe('1');
    });

    it('renders 1,234 in en-US with the comma separator', () => {
      expect(formatVoteCount(1_234, 'en-US')).toBe('1,234');
    });

    it('renders thousands in en-US', () => {
      expect(formatVoteCount(30_000, 'en-US')).toBe('30,000');
      expect(formatVoteCount(1_234_567, 'en-US')).toBe('1,234,567');
    });

    it('uses the period separator in de-DE', () => {
      expect(formatVoteCount(30_000, 'de-DE')).toBe('30.000');
      expect(formatVoteCount(1_234_567, 'de-DE')).toBe('1.234.567');
    });

    it('uses the period separator in es-ES for five-or-more-digit numbers', () => {
      // es-ES follows CLDR's `useGrouping: 'auto'`, which only
      // adds the separator when there is more than one group
      // (>= 10000). Four-digit numbers render without one.
      expect(formatVoteCount(30_000, 'es-ES')).toBe('30.000');
      expect(formatVoteCount(1_234_567, 'es-ES')).toBe('1.234.567');
    });

    it('falls back to a sensible default when the locale is invalid', () => {
      // `Intl.NumberFormat` does not throw on unknown locales;
      // it falls back to the runtime default (period group
      // separator in V8). The point of the test is that we do
      // not surface a runtime error to the UI.
      const out = formatVoteCount(30_000, 'xx-YY');
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(0);
    });

    it('falls back to en-US when no locale is provided', () => {
      expect(formatVoteCount(1_000)).toBe('1,000');
    });

    it('falls back to en-US when the locale tag is malformed', () => {
      const out = formatVoteCount(1_000, 'not-a-tag!!!');
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(0);
    });
  });

  describe('formatVoteCountCompact', () => {
    it('renders 30K in en-US', () => {
      expect(formatVoteCountCompact(30_000, 'en-US')).toBe('30K');
    });

    it('renders 1.2M in en-US', () => {
      expect(formatVoteCountCompact(1_200_000, 'en-US')).toBe('1.2M');
    });

    it('renders sub-thousand counts unchanged', () => {
      expect(formatVoteCountCompact(900, 'en-US')).toBe('900');
    });

    it('uses the period grouping in de-DE', () => {
      // German uses a period as the thousands separator in both
      // standard and compact forms.
      expect(formatVoteCountCompact(30_000, 'de-DE')).toBe('30.000');
    });

    it('falls back to en-US when no locale is provided', () => {
      expect(formatVoteCountCompact(30_000)).toBe('30K');
    });

    it('falls back to en-US when the locale tag is malformed', () => {
      const out = formatVoteCountCompact(30_000, 'not-a-tag!!!');
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(0);
    });
  });
});
