/**
 * List — a themed collection of movies the user curates locally
 * (e.g. "90s noir"). Lists live next to the user's library in the
 * browser's localStorage; they survive reloads but not a storage
 * wipe. The schema lives next to the type because every read goes
 * through the same parser; the type and the parser must agree.
 *
 * Three notes on shape, on purpose:
 *
 *   1. `movieIds` stores only the TMDB ids, not the movie
 *      payloads. The detail page joins the ids against the
 *      local library at render time so the same `LibraryEntry`
 *      is the single source of truth for movie metadata. If a
 *      list references a movie that is no longer in the library,
 *      the row is dropped with a one-time hint instead of
 *      crashing the page.
 *
 *   2. `createdAt` and `updatedAt` are ISO-8601 strings. Storing
 *      them as strings (not `Date`) keeps the storage parser
 *      JSON-only; the domain hands back plain objects and the
 *      presentation layer formats them with `Intl.DateTimeFormat`.
 *
 *   3. `id` is a UUID v4 string. The browser has
 *      `crypto.randomUUID()` in every modern engine, so we never
 *      have to roll our own counter and never expose an integer
 *      that could collide with a TMDB movie id.
 *
 * @see Cineteca.md — "Formularios".
 */

import { z } from 'zod';

export const listSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(50),
  description: z.string().max(20),
  movieIds: z.array(z.number().int().positive()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type List = z.infer<typeof listSchema>;

/** The full lists collection is an ordered list of lists. New
 *  lists append to the end; the UI reverses the list on render. */
export const listsSchema = z.array(listSchema);
