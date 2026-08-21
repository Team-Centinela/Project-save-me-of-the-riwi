import { describe, expect, it } from 'vitest';
import {
  backdropUrl,
  DEFAULT_BACKDROP_SIZE,
  DEFAULT_POSTER_SIZE,
  posterUrl,
  type ImageConfiguration,
} from './image-configuration';

const baseConfig: ImageConfiguration = {
  baseUrl: 'http://image.tmdb.org/t/p',
  secureBaseUrl: 'https://image.tmdb.org/t/p',
  posterSizes: ['w92', 'w185', 'w500'],
  backdropSizes: ['w300', 'w780'],
  profileSizes: ['w185'],
  stillSizes: ['w300'],
  logoSizes: ['w300'],
};

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

describe('posterUrl', () => {
  it('returns null when the path is null', () => {
    expect(posterUrl(baseConfig, null)).toBeNull();
  });

  it('returns null when the path is the empty string', () => {
    expect(posterUrl(baseConfig, '')).toBeNull();
  });

  it('builds a URL with the requested size when available', () => {
    expect(posterUrl(baseConfig, '/abc.jpg', 'w500')).toBe(
      'https://image.tmdb.org/t/p/w500/abc.jpg',
    );
  });

  it('falls back to the first configured size when the requested size is unknown', () => {
    expect(posterUrl(baseConfig, '/abc.jpg', 'w9999')).toBe(
      'https://image.tmdb.org/t/p/w92/abc.jpg',
    );
  });

  it('falls back to the default size when the catalogue is empty', () => {
    const empty: ImageConfiguration = { ...baseConfig, posterSizes: [] };
    expect(posterUrl(empty, '/abc.jpg')).toBe(
      `https://image.tmdb.org/t/p/${DEFAULT_POSTER_SIZE}/abc.jpg`,
    );
  });

  it('uses the default size when none is requested', () => {
    expect(posterUrl(baseConfig, '/abc.jpg')).toBe(
      `https://image.tmdb.org/t/p/${DEFAULT_POSTER_SIZE}/abc.jpg`,
    );
  });
});

describe('backdropUrl', () => {
  it('returns null when the path is null', () => {
    expect(backdropUrl(baseConfig, null)).toBeNull();
  });

  it('builds a URL with the requested size when available', () => {
    expect(backdropUrl(baseConfig, '/bd.jpg', 'w780')).toBe(
      'https://image.tmdb.org/t/p/w780/bd.jpg',
    );
  });

  it('falls back to the first configured size when the requested size is unknown', () => {
    expect(backdropUrl(baseConfig, '/bd.jpg', 'w9999')).toBe(
      'https://image.tmdb.org/t/p/w300/bd.jpg',
    );
  });

  it('falls back to the default size when the catalogue is empty', () => {
    const empty: ImageConfiguration = { ...baseConfig, backdropSizes: [] };
    expect(backdropUrl(empty, '/bd.jpg')).toBe(
      `https://image.tmdb.org/t/p/${DEFAULT_BACKDROP_SIZE}/bd.jpg`,
    );
  });
});
