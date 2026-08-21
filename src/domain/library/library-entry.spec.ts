import { describe, expect, it } from 'vitest';
import { entryToMovieSummary, libraryEntrySchema, librarySchema } from './library-entry';

const baseEntry = {
  id: 27205,
  title: 'Inception',
  originalTitle: 'Inception',
  overview: 'A thief who steals corporate secrets.',
  releaseDate: '2010-07-16',
  releaseYear: 2010,
  posterPath: '/abc.jpg',
  backdropPath: '/bd.jpg',
  voteAverage: 8.4,
  voteCount: 30_000,
  genreIds: [28, 12, 878],
  savedAt: '2024-01-01T00:00:00.000Z',
};

describe('domain/library/library-entry', () => {
  describe('libraryEntrySchema', () => {
    it('parses a valid entry', () => {
      const parsed = libraryEntrySchema.parse(baseEntry);
      expect(parsed.id).toBe(27205);
      expect(parsed.title).toBe('Inception');
    });

    it('rejects an entry with a non-positive id', () => {
      expect(() => libraryEntrySchema.parse({ ...baseEntry, id: 0 })).toThrow();
    });

    it('rejects an entry with a vote_average above 10', () => {
      expect(() => libraryEntrySchema.parse({ ...baseEntry, voteAverage: 11 })).toThrow();
    });

    it('rejects an entry with a negative vote_count', () => {
      expect(() => libraryEntrySchema.parse({ ...baseEntry, voteCount: -1 })).toThrow();
    });

    it('rejects an entry without a datetime savedAt', () => {
      expect(() => libraryEntrySchema.parse({ ...baseEntry, savedAt: 'not-a-date' })).toThrow();
    });

    it('coerces a null releaseDate to the empty string', () => {
      const parsed = libraryEntrySchema.parse({ ...baseEntry, releaseDate: null });
      expect(parsed.releaseDate).toBe('');
    });
  });

  describe('librarySchema', () => {
    it('parses an empty list', () => {
      expect(librarySchema.parse([])).toEqual([]);
    });

    it('parses a list of entries', () => {
      const list = librarySchema.parse([baseEntry, { ...baseEntry, id: 603, title: 'The Matrix' }]);
      expect(list.length).toBe(2);
    });

    it('rejects a list with one corrupt entry', () => {
      expect(() =>
        librarySchema.parse([baseEntry, { ...baseEntry, id: 'not-a-number' }]),
      ).toThrow();
    });
  });

  describe('entryToMovieSummary', () => {
    it('reconstructs a released movie with consolidated rating', () => {
      const summary = entryToMovieSummary(libraryEntrySchema.parse(baseEntry));
      expect(summary.id).toBe(27205);
      expect(summary.title).toBe('Inception');
      expect(summary.state.kind).toBe('released');
      expect(summary.rating.kind).toBe('consolidated');
    });

    it('maps missing year to the unknown state', () => {
      const summary = entryToMovieSummary(
        libraryEntrySchema.parse({ ...baseEntry, releaseYear: null, releaseDate: '' }),
      );
      expect(summary.state.kind).toBe('unknown');
    });

    it('maps zero votes to the unknown rating', () => {
      const summary = entryToMovieSummary(
        libraryEntrySchema.parse({ ...baseEntry, voteCount: 0, voteAverage: 0 }),
      );
      expect(summary.rating.kind).toBe('unknown');
    });

    it('maps an empty posterPath to NoData absent', () => {
      const summary = entryToMovieSummary(
        libraryEntrySchema.parse({ ...baseEntry, posterPath: '' }),
      );
      expect(summary.posterPath).toEqual({ kind: 'absent' });
    });

    it('maps a present posterPath to NoData present', () => {
      const summary = entryToMovieSummary(
        libraryEntrySchema.parse({ ...baseEntry, posterPath: '/p.jpg' }),
      );
      expect(summary.posterPath).toEqual({ kind: 'present', value: '/p.jpg' });
    });

    it('maps an empty backdropPath to NoData absent', () => {
      const summary = entryToMovieSummary(
        libraryEntrySchema.parse({ ...baseEntry, backdropPath: '' }),
      );
      expect(summary.backdropPath).toEqual({ kind: 'absent' });
    });

    it('maps a present backdropPath to NoData present', () => {
      const summary = entryToMovieSummary(
        libraryEntrySchema.parse({ ...baseEntry, backdropPath: '/bd.jpg' }),
      );
      expect(summary.backdropPath).toEqual({ kind: 'present', value: '/bd.jpg' });
    });

    it('marks a future year as unreleased', () => {
      const futureYear = new Date().getFullYear() + 2;
      const summary = entryToMovieSummary(
        libraryEntrySchema.parse({ ...baseEntry, releaseYear: futureYear }),
      );
      expect(summary.state.kind).toBe('unreleased');
    });

    it('marks a past year as released', () => {
      const summary = entryToMovieSummary(
        libraryEntrySchema.parse({ ...baseEntry, releaseYear: 2000 }),
      );
      expect(summary.state.kind).toBe('released');
    });
  });
});
