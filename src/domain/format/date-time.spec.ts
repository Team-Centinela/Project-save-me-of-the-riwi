import { describe, expect, it } from 'vitest';
import { formatDateTime } from './date-time';

describe('domain/format/date-time', () => {
  it('renders the medium date + short time in en-US', () => {
    const out = formatDateTime('2024-08-15T13:45:00Z', 'en-US');
    expect(out).toContain('2024');
    expect(out).toContain('Aug');
  });

  it('renders with the German day-first layout', () => {
    const out = formatDateTime('2024-08-15T13:45:00Z', 'de-DE');
    expect(out).toContain('2024');
    expect(out).toContain('15');
  });

  it('renders with the Spanish slash-day layout', () => {
    const out = formatDateTime('2024-08-15T13:45:00Z', 'es-CO');
    expect(out).toContain('2024');
    expect(out).toContain('15');
  });

  it('falls back to en-US when no locale is provided', () => {
    const out = formatDateTime('2024-08-15T13:45:00Z');
    expect(out).toContain('2024');
    expect(out).toContain('Aug');
  });

  it('returns the raw string when the input is not a valid date', () => {
    expect(formatDateTime('not-a-date', 'en-US')).toBe('not-a-date');
  });

  it('does not throw on invalid locales', () => {
    const out = formatDateTime('2024-08-15T13:45:00Z', 'xx-YY');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  it('falls back to en-US when the locale tag is malformed', () => {
    // `Intl.DateTimeFormat` throws RangeError on a syntactically
    // invalid tag. The catch branch keeps the function
    // crash-free.
    const out = formatDateTime('2024-08-15T13:45:00Z', 'not-a-tag!!!');
    expect(out).toContain('2024');
  });
});
