import { describe, expect, it } from 'vitest';
import { absent, isAbsent, isPresent, matchNoData, present } from './no-data';

describe('domain/shared/no-data', () => {
  describe('constructors', () => {
    it('absent() builds an absent variant', () => {
      const n = absent<string>();
      expect(n).toEqual({ kind: 'absent' });
    });

    it('present(value) builds a present variant carrying the value', () => {
      const n = present('hello');
      expect(n).toEqual({ kind: 'present', value: 'hello' });
    });

    it('absent defaults the value type to never when no type is given', () => {
      const n = absent();
      // The type parameter defaults to never; reading `.value` is not allowed.
      expect(n.kind).toBe('absent');
    });
  });

  describe('type guards', () => {
    it('isAbsent narrows to the absent variant', () => {
      const n: { kind: 'absent' } | { kind: 'present'; value: number } = absent<number>();
      if (isAbsent(n)) {
        expect(n.kind).toBe('absent');
      } else {
        throw new Error('expected absent');
      }
    });

    it('isPresent narrows to the present variant and exposes the value', () => {
      const n: { kind: 'absent' } | { kind: 'present'; value: number } = present(42);
      if (isPresent(n)) {
        expect(n.value).toBe(42);
      } else {
        throw new Error('expected present');
      }
    });
  });

  describe('matchNoData', () => {
    it('calls the absent branch when there is no data', () => {
      const result = matchNoData(absent<string>(), {
        absent: () => 'nothing here',
        present: (value) => `got ${value}`,
      });
      expect(result).toBe('nothing here');
    });

    it('calls the present branch with the value when there is data', () => {
      const result = matchNoData(present('poster.jpg'), {
        absent: () => 'nothing here',
        present: (value) => `got ${value}`,
      });
      expect(result).toBe('got poster.jpg');
    });

    it('throws when an unknown variant reaches the fold (runtime defense)', () => {
      // Bypassing the type system: a JSON.parse result or a misbehaving
      // caller might produce a value that does not match the union. The
      // defensive default catches it loudly instead of returning undefined.
      const bogus = { kind: 'bogus' } as unknown as Parameters<typeof matchNoData>[0];
      expect(() =>
        matchNoData(bogus, {
          absent: () => 'nothing here',
          present: (value: unknown) => `got ${String(value)}`,
        }),
      ).toThrow(/unreachable NoData variant/);
    });
  });
});
