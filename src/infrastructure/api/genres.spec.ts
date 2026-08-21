import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

const BASE = 'https://api.tmdb.test';
const TOKEN = 'a'.repeat(64);

describe('infrastructure/api/genres', () => {
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

  it('maps each TMDB genre into a domain Genre', async () => {
    server.use(
      http.get(`${BASE}/3/genre/movie/list`, () =>
        HttpResponse.json({
          genres: [
            { id: 28, name: 'Action' },
            { id: 12, name: 'Adventure' },
            { id: 16, name: 'Animation' },
          ],
        }),
      ),
    );

    const { getMovieGenres } = await import('./genres');
    const genres = await getMovieGenres();

    expect(genres).toEqual([
      { id: 28, name: 'Action' },
      { id: 12, name: 'Adventure' },
      { id: 16, name: 'Animation' },
    ]);
  });

  it('returns an empty list when TMDB has no genres (empty catalogue)', async () => {
    server.use(http.get(`${BASE}/3/genre/movie/list`, () => HttpResponse.json({ genres: [] })));

    const { getMovieGenres } = await import('./genres');
    const genres = await getMovieGenres();
    expect(genres).toEqual([]);
  });

  it('throws when a genre entry is missing the name field', async () => {
    server.use(
      http.get(`${BASE}/3/genre/movie/list`, () => HttpResponse.json({ genres: [{ id: 28 }] })),
    );

    const { getMovieGenres } = await import('./genres');
    await expect(getMovieGenres()).rejects.toThrow();
  });

  it('propagates HTTP errors as TmdbHttpError so the UI can match on the kind', async () => {
    server.use(
      http.get(`${BASE}/3/genre/movie/list`, () =>
        HttpResponse.json({ status_code: 7, status_message: 'Invalid API key.' }, { status: 401 }),
      ),
    );

    const { getMovieGenres } = await import('./genres');
    await expect(getMovieGenres()).rejects.toMatchObject({
      detail: { kind: 'invalidApiKey' },
    });
  });
});
