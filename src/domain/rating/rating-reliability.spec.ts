import { describe, expect, it } from 'vitest';
import {
  CONSOLIDATED_VOTE_THRESHOLD,
  isConsolidated,
  isEarly,
  isUnknownRating,
  matchRatingReliability,
  ratingReliability,
} from './rating-reliability';

describe('domain/rating/rating-reliability', () => {
  describe('ratingReliability', () => {
    it('returns unknown when there are zero votes', () => {
      expect(ratingReliability(0, 0)).toEqual({ kind: 'unknown' });
    });

    it('returns early when votes are below the consolidated threshold', () => {
      expect(ratingReliability(CONSOLIDATED_VOTE_THRESHOLD - 1, 7.5)).toEqual({
        kind: 'early',
        votes: CONSOLIDATED_VOTE_THRESHOLD - 1,
        average: 7.5,
      });
    });

    it('returns early when there is a single vote', () => {
      expect(ratingReliability(1, 9)).toEqual({
        kind: 'early',
        votes: 1,
        average: 9,
      });
    });

    it('returns consolidated when votes equal the threshold', () => {
      expect(ratingReliability(CONSOLIDATED_VOTE_THRESHOLD, 6.4)).toEqual({
        kind: 'consolidated',
        votes: CONSOLIDATED_VOTE_THRESHOLD,
        average: 6.4,
      });
    });

    it('returns consolidated when votes exceed the threshold', () => {
      expect(ratingReliability(10_000, 8.1)).toEqual({
        kind: 'consolidated',
        votes: 10_000,
        average: 8.1,
      });
    });
  });

  describe('type guards', () => {
    it('isConsolidated narrows to the consolidated variant', () => {
      const r = ratingReliability(100, 7);
      if (!isConsolidated(r)) {
        throw new Error('expected consolidated');
      }
      expect(r.votes).toBe(100);
    });

    it('isEarly narrows to the early variant', () => {
      const r = ratingReliability(5, 9);
      if (!isEarly(r)) {
        throw new Error('expected early');
      }
      expect(r.average).toBe(9);
    });

    it('isUnknownRating narrows to the unknown variant', () => {
      const r = ratingReliability(0, 0);
      expect(isUnknownRating(r)).toBe(true);
    });
  });

  describe('matchRatingReliability', () => {
    it('routes consolidated to the consolidated branch', () => {
      const result = matchRatingReliability(ratingReliability(500, 8.2), {
        consolidated: (votes, avg) => `${String(votes)} votes, ${String(avg)} avg`,
        early: (votes, avg) => `early: ${String(votes)}/${String(avg)}`,
        unknown: () => 'no ratings',
      });
      expect(result).toBe('500 votes, 8.2 avg');
    });

    it('routes early to the early branch', () => {
      const result = matchRatingReliability(ratingReliability(3, 10), {
        consolidated: () => 'cons',
        early: (votes, avg) => `early: ${String(votes)}/${String(avg)}`,
        unknown: () => 'no ratings',
      });
      expect(result).toBe('early: 3/10');
    });

    it('routes unknown to the unknown branch', () => {
      const result = matchRatingReliability(ratingReliability(0, 0), {
        consolidated: () => 'cons',
        early: () => 'early',
        unknown: () => 'no ratings',
      });
      expect(result).toBe('no ratings');
    });

    it('throws when an unknown variant reaches the fold (runtime defense)', () => {
      // Bypassing the type system on purpose: a JSON.parse result or a
      // misbehaving caller might produce a value that does not match the
      // union. The defensive default catches it loudly instead of
      // returning undefined.
      const bogus = {
        kind: 'bogus',
      } as unknown as Parameters<typeof matchRatingReliability>[0];
      expect(() =>
        matchRatingReliability(bogus, {
          consolidated: () => 'cons',
          early: () => 'early',
          unknown: () => 'no ratings',
        }),
      ).toThrow(/unreachable RatingReliability variant/);
    });
  });
});
