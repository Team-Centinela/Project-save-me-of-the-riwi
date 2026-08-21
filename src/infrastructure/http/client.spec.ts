import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

const BASE = 'https://api.tmdb.test';
const TOKEN = 'a'.repeat(64);

describe('infrastructure/http/client', () => {
  beforeEach(() => {
    // resetModules must run before the import below so the client module
    // re-evaluates with the freshly-stubbed env on every test.
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TMDB_READ_TOKEN', TOKEN);
    vi.stubEnv('VITE_TMDB_API_BASE', BASE);
    server.resetHandlers();
  });

  afterEach(() => {
    server.resetHandlers();
    vi.useRealTimers();
  });

  describe('request interceptor', () => {
    it('returns the JSON body on 200', async () => {
      server.use(http.get(`${BASE}/3/ping`, () => HttpResponse.json({ ok: true })));

      const { tmdbHttpClient } = await import('./client');
      const result = await tmdbHttpClient.get<{ ok: boolean }>('/3/ping');
      expect(result).toEqual({ ok: true });
    });

    it('attaches the Bearer token from env on every request', async () => {
      let received: string | null = null;
      server.use(
        http.get(`${BASE}/3/whoami`, ({ request }) => {
          received = request.headers.get('authorization');
          return HttpResponse.json({ ok: true });
        }),
      );

      const { tmdbHttpClient } = await import('./client');
      await tmdbHttpClient.get('/3/whoami');
      expect(received).toBe(`Bearer ${TOKEN}`);
    });

    it('sends POST, PUT and DELETE bodies through to the server', async () => {
      const seen: { method: string; body: string }[] = [];
      server.use(
        http.post(`${BASE}/3/echo`, ({ request }) =>
          request.text().then((body) => {
            seen.push({ method: 'POST', body });
            return HttpResponse.json({ ok: true });
          }),
        ),
        http.put(`${BASE}/3/echo`, ({ request }) =>
          request.text().then((body) => {
            seen.push({ method: 'PUT', body });
            return HttpResponse.json({ ok: true });
          }),
        ),
        http.delete(`${BASE}/3/echo`, () => {
          seen.push({ method: 'DELETE', body: '' });
          return HttpResponse.json({ ok: true });
        }),
      );

      const { tmdbHttpClient } = await import('./client');
      await tmdbHttpClient.post('/3/echo', { a: 1 });
      await tmdbHttpClient.put('/3/echo', { a: 2 });
      await tmdbHttpClient.delete('/3/echo');

      expect(seen.map((s) => s.method)).toEqual(['POST', 'PUT', 'DELETE']);
      expect(seen[0]?.body).toBe(JSON.stringify({ a: 1 }));
      expect(seen[1]?.body).toBe(JSON.stringify({ a: 2 }));
    });
  });

  describe('error translation', () => {
    it('translates TMDB code 34 + HTTP 404 into notFound', async () => {
      server.use(
        http.get(`${BASE}/3/movie/999`, () =>
          HttpResponse.json(
            { success: false, status_code: 34, status_message: 'Not found.' },
            { status: 404 },
          ),
        ),
      );

      const { tmdbHttpClient } = await import('./client');
      const promise = tmdbHttpClient.get('/3/movie/999');
      await expect(promise).rejects.toMatchObject({
        name: 'TmdbHttpError',
        detail: { kind: 'notFound', message: 'Not found.' },
      });
    });

    it('translates TMDB code 22 + HTTP 400 into invalidPage', async () => {
      server.use(
        http.get(`${BASE}/3/discover/movie`, () =>
          HttpResponse.json(
            { success: false, status_code: 22, status_message: 'Invalid page.' },
            { status: 400 },
          ),
        ),
      );

      const { tmdbHttpClient } = await import('./client');
      await expect(tmdbHttpClient.get('/3/discover/movie')).rejects.toMatchObject({
        detail: { kind: 'invalidPage', message: 'Invalid page.' },
      });
    });

    it('translates TMDB codes 7/10/30/31 into invalidApiKey', async () => {
      server.use(
        http.get(`${BASE}/3/configuration`, () =>
          HttpResponse.json(
            { success: false, status_code: 7, status_message: 'Invalid API key.' },
            { status: 401 },
          ),
        ),
      );

      const { tmdbHttpClient } = await import('./client');
      await expect(tmdbHttpClient.get('/3/configuration')).rejects.toMatchObject({
        detail: { kind: 'invalidApiKey', message: 'Invalid API key.' },
      });
    });

    it('translates HTTP 5xx into serverError with the status', async () => {
      server.use(
        http.get(`${BASE}/3/anything`, () =>
          HttpResponse.json({ status_message: 'Internal error.' }, { status: 500 }),
        ),
      );

      const { tmdbHttpClient } = await import('./client');
      await expect(tmdbHttpClient.get('/3/anything')).rejects.toMatchObject({
        detail: { kind: 'serverError', status: 500, message: 'Internal error.' },
      });
    });

    it('translates an unknown 4xx into unknown (no recognised TMDB code)', async () => {
      server.use(
        http.get(`${BASE}/3/weird`, () =>
          HttpResponse.json({ status_message: 'Weird.' }, { status: 418 }),
        ),
      );

      const { tmdbHttpClient } = await import('./client');
      await expect(tmdbHttpClient.get('/3/weird')).rejects.toMatchObject({
        detail: { kind: 'unknown', status: 418, message: 'Weird.' },
      });
    });

    it('falls back to the HTTP status when the body has no status_message', async () => {
      server.use(http.get(`${BASE}/3/empty`, () => HttpResponse.json({}, { status: 503 })));

      const { tmdbHttpClient } = await import('./client');
      await expect(tmdbHttpClient.get('/3/empty')).rejects.toMatchObject({
        detail: { kind: 'serverError', status: 503 },
      });
    });

    it('falls back to "Network error" when there is no response', async () => {
      server.use(http.get(`${BASE}/3/down`, () => HttpResponse.error()));

      const { tmdbHttpClient } = await import('./client');
      await expect(tmdbHttpClient.get('/3/down')).rejects.toMatchObject({
        name: 'TmdbHttpError',
        detail: { kind: 'networkError' },
      });
    });

    it('translateError falls back to "Network error" when no message or response.status is available', async () => {
      // Direct unit test for the defensive branch in messageFor.
      const { translateError } = await import('./errors');
      const error = translateError({});
      expect(error).toMatchObject({
        detail: { kind: 'networkError', message: 'Network error' },
      });
    });
  });

  describe('rate-limit handling (429)', () => {
    it('retries once with the server-indicated Retry-After and succeeds', async () => {
      let calls = 0;
      server.use(
        http.get(`${BASE}/3/throttled`, () => {
          calls += 1;
          if (calls === 1) {
            return new HttpResponse(JSON.stringify({ status_message: 'Slow down.' }), {
              status: 429,
              headers: { 'retry-after': '0' },
            });
          }
          return HttpResponse.json({ ok: true });
        }),
      );

      const { tmdbHttpClient } = await import('./client');
      const result = await tmdbHttpClient.get<{ ok: boolean }>('/3/throttled');
      expect(result).toEqual({ ok: true });
      expect(calls).toBe(2);
    });

    it('translates to rateLimited when the retry also fails', async () => {
      server.use(
        http.get(
          `${BASE}/3/throttled-forever`,
          () =>
            new HttpResponse(JSON.stringify({ status_message: 'Slow down.' }), {
              status: 429,
              headers: { 'retry-after': '0' },
            }),
        ),
      );

      const { tmdbHttpClient } = await import('./client');
      await expect(tmdbHttpClient.get('/3/throttled-forever')).rejects.toMatchObject({
        detail: { kind: 'rateLimited', retryAfterSeconds: 0 },
      });
    });

    it('defaults retry-after to 1 second when the header is missing', async () => {
      vi.useFakeTimers();
      let calls = 0;
      server.use(
        http.get(`${BASE}/3/no-header`, () => {
          calls += 1;
          if (calls === 1) {
            return new HttpResponse(JSON.stringify({ status_message: 'Slow down.' }), {
              status: 429,
            });
          }
          return HttpResponse.json({ ok: true });
        }),
      );

      const { tmdbHttpClient } = await import('./client');
      const promise = tmdbHttpClient.get<{ ok: boolean }>('/3/no-header');
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toEqual({ ok: true });
      expect(calls).toBe(2);
    });
  });
});
