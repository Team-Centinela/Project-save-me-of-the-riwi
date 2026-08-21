/**
 * TMDB HTTP client — the only place in the codebase that knows axios.
 *
 * The dependency rule (`eslint.config.js`) bans `axios` imports outside
 * `src/infrastructure/http/**`. Every TMDB call goes through
 * `tmdbHttpClient`, which is responsible for:
 *
 *  1. Attaching the read-only token from `env` on every request.
 *  2. Retrying once on `429` after the server-indicated `Retry-After`.
 *  3. Translating every failure into a `TmdbHttpError` with a
 *     discriminated `kind` — the rest of the app never sees raw axios.
 *
 * Tests cover the request interceptor (auth header), the retry path,
 * and every translation branch. MSW intercepts the calls so no real
 * network is hit.
 *
 * @see Cineteca.md — "Límite de tasa", "Errores".
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { env } from '@/config/env';
import { TmdbHttpError, translateError } from './errors';

// Module augmentation: flag a retried request so the response interceptor
// can detect "we already gave 429 a second chance". Without this, a
// pathological 429 on the retry would loop forever.
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    __tmdbRetried?: boolean;
  }
}

const REQUEST_TIMEOUT_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function attachInterceptors(instance: AxiosInstance): void {
  // Request interceptor — inject the bearer token on every call. The
  // token comes from the validated env so a missing or malformed token
  // fails at startup, not at the first request.
  instance.interceptors.request.use((config) => {
    config.headers.set('Authorization', `Bearer ${env.VITE_TMDB_READ_TOKEN}`);
    return config;
  });

  // Response interceptor — two responsibilities:
  //  - On 429 with Retry-After, wait and retry exactly once.
  //  - On any other failure (including the failed retry), translate
  //    to a typed TmdbHttpError so the caller never sees axios shape.
  instance.interceptors.response.use(
    (response): AxiosResponse => response,
    async (error: AxiosError): Promise<AxiosResponse> => {
      const config = error.config;
      const response = error.response;
      const isRateLimited = response?.status === 429;

      if (isRateLimited && config && !config.__tmdbRetried) {
        config.__tmdbRetried = true;
        const headers = response.headers as Record<string, string | undefined>;
        const retryAfterHeader = headers['retry-after'] ?? '';
        const parsed = Number.parseInt(retryAfterHeader, 10);
        const seconds = Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
        await sleep(seconds * 1000);
        // The retry hits the same interceptor. __tmdbRetried=true
        // prevents another retry, so the inner rejection is already
        // a TmdbHttpError — let it propagate without re-translating.
        return instance.request(config);
      }

      throw translateError(error);
    },
  );
}

function createTmdbHttpInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: env.VITE_TMDB_API_BASE,
    timeout: REQUEST_TIMEOUT_MS,
  });
  attachInterceptors(instance);
  return instance;
}

const tmdbHttpInstance = createTmdbHttpInstance();

/**
 * Surface for the rest of the app. Thin wrapper around the singleton
 * axios instance that returns the response body directly (no
 * `{ data, status, headers, … }` envelope at the call site).
 *
 * On failure the promise rejects with a `TmdbHttpError`.
 */
export const tmdbHttpClient = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    tmdbHttpInstance.get<T>(url, config).then((response) => response.data),

  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    tmdbHttpInstance.post<T>(url, body, config).then((response) => response.data),

  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    tmdbHttpInstance.put<T>(url, body, config).then((response) => response.data),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    tmdbHttpInstance.delete<T>(url, config).then((response) => response.data),
};

export { TmdbHttpError };
