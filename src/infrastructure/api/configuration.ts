/**
 * /configuration endpoint — TMDB image base + sizes, cached forever.
 *
 * TMDB asks for `/configuration` once per application lifetime: the
 * answer changes rarely and every image URL in the app depends on it.
 * The module keeps a single in-flight promise that every consumer
 * awaits, so the second caller of `getAppConfiguration` resolves
 * instantly with the cached value instead of hitting the network.
 *
 * Validation runs on every read of the response — even when the
 * promise is cached, the JSON that produced the cache was validated
 * once on the first call, so a subsequent read just returns the
 * already-valid domain value. The schema is the safety net if TMDB
 * ever changes shape; breaking a field in MSW must surface a clear
 * ZodError, not a silent wrong value.
 *
 * "Cached forever" here means cached for the lifetime of the
 * application process (Vite's HMR on this file resets the module,
 * which clears the cache). A future issue can lift it to
 * `localStorage` behind the storage adapter, scoped by version.
 *
 * @see Cineteca.md — "Se pide una vez y se cachea para siempre".
 */

import { z } from 'zod';
import { tmdbHttpClient } from '@/infrastructure/http/client';
import { parseWith } from './_shared';
import type { AppConfiguration } from '@/domain/configuration/app-configuration';

// Zod schema for the TMDB /configuration response. Only the fields
// the app actually needs are extracted; `change_keys` is preserved
// as a passthrough so the domain shape stays round-trippable.
const imageSchema = z.object({
  base_url: z.string(),
  secure_base_url: z.string(),
  poster_sizes: z.array(z.string()),
  backdrop_sizes: z.array(z.string()),
  profile_sizes: z.array(z.string()),
  still_sizes: z.array(z.string()),
  logo_sizes: z.array(z.string()),
});

const configurationResponseSchema = z.object({
  images: imageSchema,
  change_keys: z.array(z.string()),
});

type ConfigurationResponse = z.infer<typeof configurationResponseSchema>;

function toAppConfiguration(raw: ConfigurationResponse): AppConfiguration {
  return {
    images: {
      baseUrl: raw.images.base_url,
      secureBaseUrl: raw.images.secure_base_url,
      posterSizes: raw.images.poster_sizes,
      backdropSizes: raw.images.backdrop_sizes,
      profileSizes: raw.images.profile_sizes,
      stillSizes: raw.images.still_sizes,
      logoSizes: raw.images.logo_sizes,
    },
    changeKeys: raw.change_keys,
  };
}

// The cache: a single in-flight promise shared by every caller.
// Created lazily so a test that never asks for configuration never
// hits the network.
let cached: Promise<AppConfiguration> | undefined;

function fetchAndParse(): Promise<AppConfiguration> {
  return tmdbHttpClient
    .get<unknown>('/3/configuration')
    .then((data) => parseWith(configurationResponseSchema, data, '/3/configuration'))
    .then(toAppConfiguration);
}

/**
 * Returns the application configuration. Cached forever on first
 * successful read; subsequent calls return the same promise so the
 * network is hit once per app lifetime.
 *
 * Throws a `TmdbSchemaError` if TMDB returns a response that no
 * longer matches the expected shape. Errors raised by the HTTP
 * client (rate limits, network failures) propagate unchanged as
 * `TmdbHttpError`.
 */
export function getAppConfiguration(): Promise<AppConfiguration> {
  cached ??= fetchAndParse();
  return cached;
}

/**
 * Test-only: drop the cached promise so the next call re-fetches
 * and re-validates. Exported only because integration tests need a
 * hook to reset state between scenarios; production code never
 * calls it.
 */
export function __resetConfigurationCacheForTests(): void {
  cached = undefined;
}
