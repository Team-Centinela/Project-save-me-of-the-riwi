import { describe, expect, it } from 'vitest';
import { iso4217 } from './iso-4217';
import { minorUnitExponent, money, moneyFromMajor, moneyFromTMDB } from './money';

const USD = iso4217('USD');
const JPY = iso4217('JPY');
const KWD = iso4217('KWD');

describe('domain/money/money', () => {
  describe('money', () => {
    it('builds Money from an integer amount and a currency', () => {
      const m = money(630_000_000, USD);
      expect(m).toEqual({ amount: 630_000_000, currency: 'USD' });
    });

    it('throws when the amount is not an integer', () => {
      expect(() => money(1.5, USD)).toThrow(/integer/);
      expect(() => money(0.1, USD)).toThrow(/integer/);
      expect(() => money(Number.NaN, USD)).toThrow(/integer/);
      expect(() => money(Number.POSITIVE_INFINITY, USD)).toThrow(/integer/);
    });

    it('accepts zero as a valid amount (a free movie, not absence)', () => {
      const m = money(0, USD);
      expect(m.amount).toBe(0);
    });

    it('accepts negative amounts (refunds, debt)', () => {
      const m = money(-500, USD);
      expect(m.amount).toBe(-500);
    });
  });

  describe('minorUnitExponent', () => {
    it('returns 2 for two-decimal currencies (the default)', () => {
      expect(minorUnitExponent(USD)).toBe(2);
      expect(minorUnitExponent(iso4217('EUR'))).toBe(2);
    });

    it('returns 0 for zero-decimal currencies', () => {
      expect(minorUnitExponent(JPY)).toBe(0);
      expect(minorUnitExponent(iso4217('KRW'))).toBe(0);
    });

    it('returns 3 for three-decimal currencies', () => {
      expect(minorUnitExponent(KWD)).toBe(3);
      expect(minorUnitExponent(iso4217('BHD'))).toBe(3);
    });
  });

  describe('moneyFromMajor', () => {
    it('converts dollars to cents (exponent 2)', () => {
      const m = moneyFromMajor(63_000_000, USD);
      expect(m).toEqual({ amount: 6_300_000_000, currency: 'USD' });
    });

    it('converts yen without multiplying (exponent 0)', () => {
      const m = moneyFromMajor(63_000_000, JPY);
      expect(m).toEqual({ amount: 63_000_000, currency: 'JPY' });
    });

    it('converts Kuwaiti dinars to thousandths (exponent 3)', () => {
      const m = moneyFromMajor(1.234, KWD);
      expect(m).toEqual({ amount: 1234, currency: 'KWD' });
    });

    it('rounds fractional smallest units to avoid silent truncation', () => {
      // 1.006 USD = 100.6 cents → Math.round → 101 cents.
      // (Values like 1.005 hit a JS floating-point quirk where
      // 1.005 * 100 evaluates to 100.49999…; the behavior of this
      // function in that range depends on the binary representation
      // and is not part of the contract. We test the unambiguous case.)
      const m = moneyFromMajor(1.006, USD);
      expect(m.amount).toBe(101);
    });
  });

  describe('moneyFromTMDB', () => {
    it('parses a number string in dollars', () => {
      const m = moneyFromTMDB('63000000', USD);
      expect(m).toEqual({ amount: 6_300_000_000, currency: 'USD' });
    });

    it('parses a JSON number directly', () => {
      const m = moneyFromTMDB(63_000_000, USD);
      expect(m).toEqual({ amount: 6_300_000_000, currency: 'USD' });
    });

    it('defaults to USD when no currency is given', () => {
      const m = moneyFromTMDB(100);
      expect(m.currency).toBe('USD');
    });

    it('throws on unparseable input', () => {
      expect(() => moneyFromTMDB('not-a-number')).toThrow(/Cannot parse TMDB/);
      expect(() => moneyFromTMDB(Number.NaN)).toThrow(/Cannot parse TMDB/);
    });
  });
});
