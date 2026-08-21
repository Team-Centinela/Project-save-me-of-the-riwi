import { absent, present } from '@/domain/shared/no-data';
import { describe, expect, it } from 'vitest';
import { classifyRelease, ratingFromVotes, type MovieSummary } from './movie-summary';

describe('domain/movie/movie-summary', () => {
  describe('type shape', () => {
    it('accepts the composed readonly fields', () => {
      const summary: MovieSummary = {
        id: 1,
        title: 'Inception',
        overview: 'A thief who steals corporate secrets.',
        posterPath: present('/poster.jpg'),
        backdropPath: absent<string>(),
        state: { kind: 'released', releaseDate: new Date('2010-07-16T00:00:00Z') },
        rating: { kind: 'consolidated', votes: 1000, average: 8.4 },
        genreIds: [28, 12],
      };
      expect(summary.id).toBe(1);
      expect(summary.title).toBe('Inception');
      expect(summary.state.kind).toBe('released');
    });
  });

  describe('classifyRelease', () => {
    const now = new Date('2024-06-01T00:00:00Z');

    it('returns unknown for null and undefined', () => {
      expect(classifyRelease(null, now).kind).toBe('unknown');
      expect(classifyRelease(undefined, now).kind).toBe('unknown');
    });

    it('returns unknown for an empty string', () => {
      expect(classifyRelease('', now).kind).toBe('unknown');
    });

    it('returns unknown for an unparseable date', () => {
      expect(classifyRelease('not-a-date', now).kind).toBe('unknown');
    });

    it('returns released for a past date and carries the parsed Date', () => {
      const result = classifyRelease('2010-07-16', now);
      expect(result.kind).toBe('released');
      if (result.kind !== 'released') {
        throw new Error('expected released');
      }
      expect(result.releaseDate.toISOString()).toBe('2010-07-16T00:00:00.000Z');
    });

    it('returns released for "today" (the present is not the future)', () => {
      expect(classifyRelease('2024-06-01', now)).toEqual({
        kind: 'released',
        releaseDate: new Date('2024-06-01T00:00:00Z'),
      });
    });

    it('returns unreleased for a strictly-future date and carries the parsed Date', () => {
      const result = classifyRelease('2099-12-31', now);
      expect(result.kind).toBe('unreleased');
      if (result.kind !== 'unreleased') {
        throw new Error('expected unreleased');
      }
      expect(result.expectedReleaseDate.toISOString()).toBe('2099-12-31T00:00:00.000Z');
    });

    it('defaults "now" to the current time when not provided', () => {
      const past = new Date(Date.now() - 86_400_000);
      const iso = past.toISOString().slice(0, 10);
      expect(classifyRelease(iso).kind).toBe('released');
    });
  });

  describe('ratingFromVotes', () => {
    it('delegates to the domain rating helper', () => {
      expect(ratingFromVotes(0, 0)).toEqual({ kind: 'unknown' });
      expect(ratingFromVotes(10, 9.0)).toEqual({
        kind: 'early',
        votes: 10,
        average: 9.0,
      });
      expect(ratingFromVotes(10_000, 8.5)).toEqual({
        kind: 'consolidated',
        votes: 10_000,
        average: 8.5,
      });
    });
  });
});
