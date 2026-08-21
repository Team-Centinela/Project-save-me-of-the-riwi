import { describe, expect, it } from 'vitest';
import type { ImageConfiguration } from './image-configuration';

describe('domain/configuration/image-configuration', () => {
  it('carries the secure base and the per-type size lists', () => {
    const config: ImageConfiguration = {
      baseUrl: 'http://image.tmdb.org/t/p',
      secureBaseUrl: 'https://image.tmdb.org/t/p',
      posterSizes: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
      backdropSizes: ['w300', 'w780', 'w1280', 'original'],
      profileSizes: ['w45', 'w185', 'h632', 'original'],
      stillSizes: ['w92', 'w185', 'w300', 'original'],
      logoSizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
    };
    expect(config.secureBaseUrl).toBe('https://image.tmdb.org/t/p');
    expect(config.posterSizes).toContain('w500');
    expect(config.posterSizes).toContain('original');
  });
});
