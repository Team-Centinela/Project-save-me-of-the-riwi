import { describe, expect, it } from 'vitest';
import { isISO4217, iso4217 } from './iso-4217';

describe('domain/money/iso-4217', () => {
  describe('iso4217', () => {
    it('accepts a three-letter uppercase code', () => {
      expect(iso4217('USD')).toBe('USD');
      expect(iso4217('EUR')).toBe('EUR');
      expect(iso4217('JPY')).toBe('JPY');
    });

    it('throws on lowercase', () => {
      expect(() => iso4217('usd')).toThrow(/Invalid ISO 4217/);
    });

    it('throws on mixed case', () => {
      expect(() => iso4217('Usd')).toThrow(/Invalid ISO 4217/);
    });

    it('throws when shorter than three letters', () => {
      expect(() => iso4217('US')).toThrow(/Invalid ISO 4217/);
    });

    it('throws when longer than three letters', () => {
      expect(() => iso4217('USDX')).toThrow(/Invalid ISO 4217/);
    });

    it('throws when it contains digits', () => {
      expect(() => iso4217('US1')).toThrow(/Invalid ISO 4217/);
    });

    it('throws on the empty string', () => {
      expect(() => iso4217('')).toThrow(/Invalid ISO 4217/);
    });
  });

  describe('isISO4217', () => {
    it('returns true for a well-formed code', () => {
      expect(isISO4217('USD')).toBe(true);
    });

    it('returns false for a malformed code', () => {
      expect(isISO4217('usd')).toBe(false);
      expect(isISO4217('US')).toBe(false);
      expect(isISO4217('US1')).toBe(false);
      expect(isISO4217('')).toBe(false);
    });
  });
});
