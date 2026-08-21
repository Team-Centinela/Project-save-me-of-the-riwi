import { describe, expect, it } from 'vitest';
import type { Trailer } from './trailer';

describe('domain/movie/trailer', () => {
  it('carries the TMDB video id as a string', () => {
    const trailer: Trailer = {
      id: '65a4dcfaa30835e0384bd97b',
      key: '4Vk3f1P0YYM',
      site: 'YouTube',
      type: 'Trailer',
      name: 'Official Trailer',
    };
    expect(trailer.id).toBe('65a4dcfaa30835e0384bd97b');
    expect(trailer.key).toBe('4Vk3f1P0YYM');
    expect(trailer.site).toBe('YouTube');
    expect(trailer.type).toBe('Trailer');
    expect(trailer.name).toBe('Official Trailer');
  });
});
