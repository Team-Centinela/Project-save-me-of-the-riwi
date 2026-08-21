import { describe, expect, it } from 'vitest';
import {
  isReleased,
  isUnreleased,
  isUnknownMovieState,
  matchMovieState,
  released,
  unknownMovieState,
  unreleased,
} from './movie-state';

describe('domain/movie/movie-state', () => {
  const aRelease = new Date('2024-05-17T00:00:00Z');
  const anUpcoming = new Date('2099-12-31T00:00:00Z');

  describe('constructors', () => {
    it('released(date) carries the release date', () => {
      const s = released(aRelease);
      expect(s).toEqual({ kind: 'released', releaseDate: aRelease });
    });

    it('unreleased(date) carries the expected release date', () => {
      const s = unreleased(anUpcoming);
      expect(s).toEqual({ kind: 'unreleased', expectedReleaseDate: anUpcoming });
    });

    it('unknownMovieState() carries no payload', () => {
      const s = unknownMovieState();
      expect(s).toEqual({ kind: 'unknown' });
    });
  });

  describe('type guards', () => {
    it('isReleased narrows to the released variant', () => {
      const s = released(aRelease);
      if (!isReleased(s)) {
        throw new Error('expected released');
      }
      expect(s.releaseDate).toEqual(aRelease);
    });

    it('isUnreleased narrows to the unreleased variant', () => {
      const s = unreleased(anUpcoming);
      if (!isUnreleased(s)) {
        throw new Error('expected unreleased');
      }
      expect(s.expectedReleaseDate).toEqual(anUpcoming);
    });

    it('isUnknownMovieState narrows to the unknown variant', () => {
      const s = unknownMovieState();
      expect(isUnknownMovieState(s)).toBe(true);
    });

    it('isReleased is false for unreleased and unknown', () => {
      expect(isReleased(unreleased(anUpcoming))).toBe(false);
      expect(isReleased(unknownMovieState())).toBe(false);
    });
  });

  describe('matchMovieState', () => {
    it('routes released to the released branch', () => {
      const result = matchMovieState(released(aRelease), {
        released: (date) => `out on ${date.toISOString()}`,
        unreleased: (date) => `coming ${date.toISOString()}`,
        unknown: () => 'no info',
      });
      expect(result).toBe(`out on ${aRelease.toISOString()}`);
    });

    it('routes unreleased to the unreleased branch', () => {
      const result = matchMovieState(unreleased(anUpcoming), {
        released: () => 'out',
        unreleased: (date) => `coming ${date.toISOString()}`,
        unknown: () => 'no info',
      });
      expect(result).toBe(`coming ${anUpcoming.toISOString()}`);
    });

    it('routes unknown to the unknown branch', () => {
      const result = matchMovieState(unknownMovieState(), {
        released: () => 'out',
        unreleased: () => 'coming',
        unknown: () => 'no info',
      });
      expect(result).toBe('no info');
    });

    it('throws when an unknown variant reaches the fold (runtime defense)', () => {
      // Bypassing the type system on purpose: a JSON.parse result or a
      // misbehaving caller might produce a value that does not match the
      // union. The defensive default catches it loudly instead of
      // returning undefined.
      const bogus = {
        kind: 'bogus',
      } as unknown as Parameters<typeof matchMovieState>[0];
      expect(() =>
        matchMovieState(bogus, {
          released: () => 'out',
          unreleased: () => 'coming',
          unknown: () => 'no info',
        }),
      ).toThrow(/unreachable MovieState variant/);
    });
  });
});
