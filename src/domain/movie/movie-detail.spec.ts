import { absent, present } from '@/domain/shared/no-data';
import { iso4217 } from '@/domain/money/iso-4217';
import { moneyFromMajor } from '@/domain/money/money';
import { released } from '@/domain/movie/movie-state';
import { describe, expect, it } from 'vitest';
import { type MovieDetail } from './movie-detail';

describe('domain/movie/movie-detail', () => {
  it('extends MovieSummary with detail fields and uses NoData for absent ones', () => {
    const detail: MovieDetail = {
      id: 1,
      title: 'Inception',
      overview: 'A thief who steals corporate secrets.',
      posterPath: present('/poster.jpg'),
      backdropPath: absent<string>(),
      state: released(new Date('2010-07-16T00:00:00Z')),
      rating: { kind: 'consolidated', votes: 1000, average: 8.4 },
      genreIds: [28, 12],
      tagline: present('Your mind is the scene of the crime.'),
      runtime: present(148),
      genres: [
        { id: 28, name: 'Action' },
        { id: 12, name: 'Adventure' },
      ],
      budget: present(moneyFromMajor(160_000_000, iso4217('USD'))),
      revenue: present(moneyFromMajor(836_800_000, iso4217('USD'))),
      cast: present([]),
      trailers: absent<readonly never[]>(),
    };

    expect(detail.runtime).toEqual({ kind: 'present', value: 148 });
    expect(detail.budget).toEqual({
      kind: 'present',
      value: { amount: 16_000_000_000, currency: iso4217('USD') },
    });
    expect(detail.cast).toEqual({ kind: 'present', value: [] });
    expect(detail.trailers.kind).toBe('absent');
  });
});
