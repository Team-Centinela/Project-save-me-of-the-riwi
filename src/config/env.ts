import { z } from 'zod';

export const envSchema = z.object({
  VITE_TMDB_READ_TOKEN: z
    .string()
    .min(40, 'VITE_TMDB_READ_TOKEN must be at least 40 characters (TMDB v3 token or v4 JWT).'),
  VITE_TMDB_API_BASE: z
    .url('VITE_TMDB_API_BASE must be a valid URL.')
    .default('https://api.themoviedb.org'),
  VITE_TMDB_IMAGE_BASE: z
    .url('VITE_TMDB_IMAGE_BASE must be a valid URL.')
    .default('https://image.tmdb.org/t/p'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
}

export const env: Env = parsed.data;
