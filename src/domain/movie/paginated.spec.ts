import { describe, expect, it } from 'vitest';
import type { PaginatedList } from './paginated';

describe('domain/movie/paginated', () => {
  it('is a structural type: a concrete value satisfies the contract', () => {
    const list: PaginatedList<number> = {
      page: 1,
      results: [1, 2, 3],
      totalPages: 2,
      totalResults: 6,
    };
    expect(list.page).toBe(1);
    expect(list.results).toEqual([1, 2, 3]);
    expect(list.totalPages).toBe(2);
    expect(list.totalResults).toBe(6);
  });
});
