/**
 * TMDB error types — the boundary translation.
 *
 * TMDB returns errors in two layers: an HTTP status (4xx/5xx) and a body
 * with its own numeric `status_code` and a `status_message`. The numeric
 * codes do not match HTTP — "resource not found" is TMDB code 34 with
 * HTTP 404, and "invalid page" is TMDB code 22 with HTTP 400.
 *
 * This file is the single place that translates a raw Axios failure
 * into a typed `TmdbHttpError` carrying a discriminated kind. The rest
 * of the app handles the kind, never the raw Axios shape.
 *
 * @see Cineteca.md — "Errores".
 */

export type TmdbError =
  | { readonly kind: 'notFound'; readonly message: string }
  | { readonly kind: 'invalidPage'; readonly message: string }
  | {
      readonly kind: 'invalidApiKey';
      readonly message: string;
    }
  | {
      readonly kind: 'rateLimited';
      readonly message: string;
      readonly retryAfterSeconds: number;
    }
  | {
      readonly kind: 'serverError';
      readonly status: number;
      readonly message: string;
    }
  | { readonly kind: 'networkError'; readonly message: string }
  | {
      readonly kind: 'unknown';
      readonly status: number;
      readonly message: string;
    };

/**
 * Thrown by the HTTP client on any failure. Carries the discriminated
 * `detail` so callers can pattern-match on `kind` instead of inspecting
 * HTTP statuses or TMDB numeric codes.
 */
export class TmdbHttpError extends Error {
  override name = 'TmdbHttpError' as const;
  readonly detail: TmdbError;

  constructor(detail: TmdbError) {
    super(detail.message);
    this.detail = detail;
  }
}

interface TmdbErrorBody {
  readonly status_code?: number;
  readonly status_message?: string;
}

function isTmdbErrorBody(value: unknown): value is TmdbErrorBody {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    (v.status_code === undefined || typeof v.status_code === 'number') &&
    (v.status_message === undefined || typeof v.status_message === 'string')
  );
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBody(error: { response?: { data?: unknown } }): TmdbErrorBody {
  const data = error.response?.data;
  return isTmdbErrorBody(data) ? data : {};
}

function messageFor(error: { message?: string; response?: { status?: number } }): string {
  if (typeof error.message === 'string' && error.message.length > 0) {
    return error.message;
  }
  if (typeof error.response?.status === 'number') {
    return `HTTP ${String(error.response.status)}`;
  }
  return 'Network error';
}

/**
 * Translate a TMDB / HTTP failure into a `TmdbHttpError`. Called by
 * the client once the retry path has given up.
 *
 * - `429` → `rateLimited` (with the server-indicated retry-after).
 * - TMDB body codes 22, 34, 7/10/30/31 → mapped kinds (the ones
 *   documented in Cineteca.md plus the auth-related cluster).
 * - HTTP 5xx → `serverError`.
 * - HTTP 4xx without a recognised TMDB code → `unknown`.
 * - No response (network failure) → `networkError`.
 *
 * The mapping for TMDB body codes is intentionally partial: the
 * documentation only covers a handful of codes, and the rest fall
 * through to the HTTP-status fallback. A future issue can extend
 * the table if a feature needs it.
 */
export function translateError(error: {
  message?: string;
  response?: {
    status?: number;
    data?: unknown;
    headers?: Record<string, string | undefined>;
  };
}): TmdbHttpError {
  const status = error.response?.status;
  const body = readBody(error);
  const code = asNumber(body.status_code, Number.NaN);
  const message = asString(body.status_message, messageFor(error));

  if (status === 429) {
    const retryAfterHeader = error.response?.headers?.['retry-after'];
    const parsed = Number.parseInt(retryAfterHeader ?? '', 10);
    // Retry-After is a positive integer in seconds (per RFC 9110). A
    // value of 0 is valid and means "retry immediately"; only a
    // missing, non-numeric, or negative header falls back to 1.
    const retryAfterSeconds = Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
    return new TmdbHttpError({
      kind: 'rateLimited',
      message,
      retryAfterSeconds,
    });
  }

  if (!Number.isNaN(code)) {
    if (code === 22) {
      return new TmdbHttpError({ kind: 'invalidPage', message });
    }
    if (code === 34) {
      return new TmdbHttpError({ kind: 'notFound', message });
    }
    if (code === 7 || code === 10 || code === 30 || code === 31) {
      return new TmdbHttpError({ kind: 'invalidApiKey', message });
    }
  }

  if (typeof status === 'number') {
    if (status >= 500) {
      return new TmdbHttpError({ kind: 'serverError', status, message });
    }
    return new TmdbHttpError({ kind: 'unknown', status, message });
  }

  return new TmdbHttpError({ kind: 'networkError', message });
}
