// infrastructure/api/_shared.spec.ts
//
// Verifies the two boundary guarantees shared by every endpoint
// module (issue #24 acceptance criteria):
//
//   1. A drifted response shape surfaces as a `TmdbSchemaError`
//      with a readable message and per-path issues — never as a
//      raw `ZodError` dump.
//   2. The requested page is clamped into `[1, 500]` so the API
//      layer itself respects TMDB's hard cap, regardless of any
//      presentation-layer guard.

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { TmdbSchemaError, clampPage, parseWith } from './_shared';

const schema = z.object({ id: z.number(), title: z.string() });

describe('infrastructure/api/_shared', () => {
  describe('parseWith', () => {
    it('returns the parsed value when the data matches the schema', () => {
      const parsed = parseWith(schema, { id: 1, title: 'Inception' }, '/3/test');
      expect(parsed).toEqual({ id: 1, title: 'Inception' });
    });

    it('throws a TmdbSchemaError (not a ZodError) when a field is broken', () => {
      expect.assertions(4);
      try {
        parseWith(schema, { id: 'not-a-number', title: 'Inception' }, '/3/test');
        throw new Error('expected parseWith to throw');
      } catch (cause: unknown) {
        expect(cause).toBeInstanceOf(TmdbSchemaError);
        expect(cause).not.toBeInstanceOf(z.ZodError);
        const error = cause as TmdbSchemaError;
        expect(error.endpoint).toBe('/3/test');
        expect(error.name).toBe('TmdbSchemaError');
      }
    });

    it('carries a human-readable message naming the endpoint and first failing path', () => {
      try {
        parseWith(schema, { id: 'oops', title: 42 }, '/3/discover/movie');
        throw new Error('expected parseWith to throw');
      } catch (cause: unknown) {
        const error = cause as TmdbSchemaError;
        expect(error.message).toContain('/3/discover/movie');
        expect(error.message).toContain('id');
        // One line per failing path, in schema order.
        expect(error.issues.length).toBe(2);
        expect(error.issues[0]).toMatch(/^id:/);
        expect(error.issues[1]).toMatch(/^title:/);
      }
    });

    it('renders <root> for issues that are not attached to a path', () => {
      try {
        parseWith(z.string(), 42, '/3/test');
        throw new Error('expected parseWith to throw');
      } catch (cause: unknown) {
        const error = cause as TmdbSchemaError;
        expect(error.issues[0]).toMatch(/^<root>:/);
      }
    });

    it('preserves the original ZodError as the error cause', () => {
      try {
        parseWith(schema, {}, '/3/test');
        throw new Error('expected parseWith to throw');
      } catch (cause: unknown) {
        expect((cause as TmdbSchemaError).cause).toBeInstanceOf(z.ZodError);
      }
    });

    it('rethrows non-Zod failures untouched', () => {
      const exploding = {
        parse: () => {
          throw new Error('boom');
        },
      } as unknown as z.ZodType<{ id: number }>;
      expect(() => parseWith(exploding, {}, '/3/test')).toThrow('boom');
    });
  });

  describe('clampPage', () => {
    it('passes undefined through so the param stays unset', () => {
      expect(clampPage(undefined)).toBeUndefined();
    });

    it('maps non-finite values to undefined so nothing invalid is sent', () => {
      expect(clampPage(Number.NaN)).toBeUndefined();
      expect(clampPage(Number.POSITIVE_INFINITY)).toBeUndefined();
    });

    it('clamps below the floor to page 1', () => {
      expect(clampPage(0)).toBe(1);
      expect(clampPage(-5)).toBe(1);
    });

    it('keeps in-range pages untouched', () => {
      expect(clampPage(1)).toBe(1);
      expect(clampPage(250)).toBe(250);
      expect(clampPage(500)).toBe(500);
    });

    it('clamps above the cap to page 500', () => {
      expect(clampPage(501)).toBe(500);
      expect(clampPage(10_000)).toBe(500);
    });

    it('truncates fractional pages toward zero before clamping', () => {
      expect(clampPage(2.9)).toBe(2);
      expect(clampPage(600.5)).toBe(500);
    });
  });
});
