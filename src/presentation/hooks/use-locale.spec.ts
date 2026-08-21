// presentation/hooks/use-locale.spec.ts

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useLocale } from './use-locale';

describe('useLocale', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });
  });

  it('returns the browser language when present', () => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'es-AR' });
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe('es-AR');
  });

  it('falls back to en-US when the browser language is empty', () => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: '' });
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe('en-US');
  });

  it('returns the same value across re-renders (memoized)', () => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'fr-FR' });
    const { result, rerender } = renderHook(() => useLocale());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
