import { describe, expect, it } from 'vitest';
import { formatDuration } from './duration';

describe('domain/format/duration', () => {
  it('returns a dash for null', () => {
    expect(formatDuration(null)).toBe('—');
  });

  it('returns a dash for undefined', () => {
    expect(formatDuration(undefined)).toBe('—');
  });

  it('returns a dash for zero', () => {
    expect(formatDuration(0)).toBe('—');
  });

  it('returns a dash for negative numbers', () => {
    expect(formatDuration(-10)).toBe('—');
  });

  it('returns a dash for non-finite numbers', () => {
    expect(formatDuration(Number.NaN)).toBe('—');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('formats minutes-only runtimes', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(1)).toBe('1m');
    expect(formatDuration(59)).toBe('59m');
  });

  it('formats exact-hour runtimes', () => {
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(120)).toBe('2h');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(148)).toBe('2h 28m');
  });

  it('rounds fractional minutes to the nearest integer', () => {
    expect(formatDuration(89.6)).toBe('1h 30m');
    expect(formatDuration(89.4)).toBe('1h 29m');
  });
});
