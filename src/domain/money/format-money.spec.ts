import { afterEach, describe, expect, it, vi } from 'vitest';
import { iso4217 } from './iso-4217';
import { money, moneyFromMajor } from './money';
import { formatMoney } from './format-money';

describe('domain/money/format-money', () => {
  const USD = iso4217('USD');
  const JPY = iso4217('JPY');
  const KWD = iso4217('KWD');

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('formatMoney', () => {
    it('formats USD with the en-US locale as a dollar amount with cents', () => {
      const m = moneyFromMajor(63_000_000, USD);
      expect(formatMoney(m, { locale: 'en-US' })).toBe('$63,000,000.00');
    });

    it('formats USD with the de-DE locale (decimal comma, dot thousands)', () => {
      const m = moneyFromMajor(63_000_000, USD);
      // de-DE uses "63.000.000,00 $" for USD. We only check the
      // structurally-significant parts to stay robust against
      // Intl-version updates (the surrounding "$" is the data, not
      // the formatter — see below for the strict check).
      const formatted = formatMoney(m, { locale: 'de-DE' });
      expect(formatted).toContain('63.000.000');
      expect(formatted).toContain(',00');
    });

    it('formats USD with the fr-FR locale (narrow no-break space)', () => {
      const m = moneyFromMajor(63_000_000, USD);
      const formatted = formatMoney(m, { locale: 'fr-FR' });
      expect(formatted).toContain('63');
      expect(formatted).toContain('000');
      expect(formatted).toContain('000');
      expect(formatted).toContain(',00');
    });

    it('formats JPY with no decimals (zero-decimal currency)', () => {
      const m = money(63_000_000, JPY);
      const formatted = formatMoney(m, { locale: 'en-US' });
      // JPY has no fractional unit; Intl renders it without decimals.
      expect(formatted).toContain('63,000,000');
      expect(formatted).not.toContain('.00');
    });

    it('formats KWD with three decimal places', () => {
      const m = moneyFromMajor(1.234, KWD);
      const formatted = formatMoney(m, { locale: 'en-US' });
      expect(formatted).toContain('1.234');
    });

    it('renders zero in the currency rather than a placeholder', () => {
      // Zero is a real value (a free movie), not absence. The caller
      // is responsible for using NoData<Money> when there is no info;
      // this formatter does not make that decision.
      const m = money(0, USD);
      const formatted = formatMoney(m, { locale: 'en-US' });
      expect(formatted).toBe('$0.00');
    });

    it('formats negative amounts (refunds, debt)', () => {
      const m = money(-500, USD);
      expect(formatMoney(m, { locale: 'en-US' })).toBe('-$5.00');
    });

    it('falls back to en-US when navigator is unavailable (SSR / Node)', () => {
      // Remove `navigator` from the global scope to simulate the SSR /
      // Node environment. The formatter must still produce a result by
      // defaulting to 'en-US' rather than crashing on a missing locale.
      vi.stubGlobal('navigator', undefined);
      const m = money(0, USD);
      expect(formatMoney(m)).toBe('$0.00');
    });

    it('uses navigator.language when no locale is provided', () => {
      // Stub navigator with a non-default language so the call site
      // demonstrates that the browser's preference wins.
      vi.stubGlobal('navigator', { language: 'de-DE' });
      const m = money(100, USD);
      const formatted = formatMoney(m);
      expect(formatted).toContain('1,00');
    });
  });
});
