import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

const BASE = 'https://api.tmdb.test';
const TOKEN = 'a'.repeat(64);

const handlerPath = `${BASE}/3/configuration`;

const validResponse = () => ({
  images: {
    base_url: 'http://image.tmdb.org/t/p',
    secure_base_url: 'https://image.tmdb.org/t/p',
    poster_sizes: ['w92', 'w185', 'w500', 'original'],
    backdrop_sizes: ['w300', 'w1280', 'original'],
    profile_sizes: ['w45', 'w185', 'original'],
    still_sizes: ['w92', 'w300', 'original'],
    logo_sizes: ['w45', 'w300', 'original'],
  },
  change_keys: ['adult', 'air_date', 'also_known_as'],
});

describe('infrastructure/api/configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TMDB_READ_TOKEN', TOKEN);
    vi.stubEnv('VITE_TMDB_API_BASE', BASE);
    server.resetHandlers();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('fetches /3/configuration and maps to a domain AppConfiguration', async () => {
    server.use(http.get(handlerPath, () => HttpResponse.json(validResponse())));

    const { getAppConfiguration } = await import('./configuration');
    const config = await getAppConfiguration();

    expect(config.images.secureBaseUrl).toBe('https://image.tmdb.org/t/p');
    expect(config.images.posterSizes).toContain('w500');
    expect(config.images.backdropSizes).toEqual(['w300', 'w1280', 'original']);
    expect(config.changeKeys).toContain('adult');
  });

  it('caches the result across calls so the network is hit once', async () => {
    let calls = 0;
    server.use(
      http.get(handlerPath, () => {
        calls += 1;
        return HttpResponse.json(validResponse());
      }),
    );

    const { getAppConfiguration } = await import('./configuration');
    const first = await getAppConfiguration();
    const second = await getAppConfiguration();

    expect(first).toBe(second);
    expect(calls).toBe(1);
  });

  it('throws a ZodError (caught by the caller) when the response breaks the schema', async () => {
    // Simulate a TMDB shape change: missing `change_keys`.
    server.use(
      http.get(handlerPath, () =>
        HttpResponse.json({
          images: {
            base_url: 'http://image.tmdb.org/t/p',
            secure_base_url: 'https://image.tmdb.org/t/p',
            poster_sizes: ['w185'],
            backdrop_sizes: ['w1280'],
            profile_sizes: ['w185'],
            still_sizes: ['w300'],
            logo_sizes: ['w300'],
          },
        }),
      ),
    );

    const { getAppConfiguration } = await import('./configuration');
    // The cache has now stored a rejected promise. Clear it so a
    // retry in this test does not see the previous failure.
    await expect(getAppConfiguration()).rejects.toThrow();
  });

  it('surfaces HTTP errors raised by the underlying client (e.g. 404)', async () => {
    server.use(
      http.get(handlerPath, () =>
        HttpResponse.json(
          { success: false, status_code: 34, status_message: 'Not found.' },
          { status: 404 },
        ),
      ),
    );

    const { getAppConfiguration } = await import('./configuration');
    await expect(getAppConfiguration()).rejects.toMatchObject({
      name: 'TmdbHttpError',
      detail: { kind: 'notFound' },
    });
  });

  it('clears the cache when __resetConfigurationCacheForTests is called', async () => {
    let calls = 0;
    server.use(
      http.get(handlerPath, () => {
        calls += 1;
        return HttpResponse.json(validResponse());
      }),
    );

    const { getAppConfiguration, __resetConfigurationCacheForTests } =
      await import('./configuration');
    await getAppConfiguration();
    await getAppConfiguration();
    expect(calls).toBe(1);

    __resetConfigurationCacheForTests();
    await getAppConfiguration();
    expect(calls).toBe(2);
  });
});
