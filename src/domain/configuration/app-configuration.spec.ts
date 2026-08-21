import { describe, expect, it } from 'vitest';
import type { AppConfiguration } from './app-configuration';

describe('domain/configuration/app-configuration', () => {
  it('wraps the image configuration and exposes change_keys', () => {
    const config: AppConfiguration = {
      images: {
        baseUrl: 'http://image.tmdb.org/t/p',
        secureBaseUrl: 'https://image.tmdb.org/t/p',
        posterSizes: ['w185'],
        backdropSizes: ['w1280'],
        profileSizes: ['w185'],
        stillSizes: ['w300'],
        logoSizes: ['w300'],
      },
      changeKeys: ['adult', 'air_date', 'also_known_as'],
    };
    expect(config.images.secureBaseUrl).toBe('https://image.tmdb.org/t/p');
    expect(config.changeKeys).toContain('adult');
  });
});
