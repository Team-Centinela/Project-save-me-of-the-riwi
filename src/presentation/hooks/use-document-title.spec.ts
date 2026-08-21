// presentation/hooks/use-document-title.spec.ts

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDocumentTitle } from './use-document-title';

describe('useDocumentTitle', () => {
  afterEach(() => {
    document.title = 'Cineteca';
  });

  it('sets the document title to the provided value', () => {
    renderHook(() => {
      useDocumentTitle('Inception — Cineteca');
    });
    expect(document.title).toBe('Inception — Cineteca');
  });

  it('uses the default when the title is null', () => {
    renderHook(() => {
      useDocumentTitle(null);
    });
    expect(document.title).toBe('Cineteca');
  });

  it('uses the default when the title is the empty string', () => {
    renderHook(() => {
      useDocumentTitle('');
    });
    expect(document.title).toBe('Cineteca');
  });

  it('restores the previous title on unmount', () => {
    document.title = 'Previous';
    const { unmount } = renderHook(() => {
      useDocumentTitle('Inception — Cineteca');
    });
    expect(document.title).toBe('Inception — Cineteca');
    act(() => {
      unmount();
    });
    expect(document.title).toBe('Previous');
  });

  it('updates the title when the value changes', () => {
    const { rerender } = renderHook(
      ({ title }) => {
        useDocumentTitle(title);
      },
      { initialProps: { title: 'First — Cineteca' } },
    );
    expect(document.title).toBe('First — Cineteca');
    rerender({ title: 'Second — Cineteca' });
    expect(document.title).toBe('Second — Cineteca');
  });
});
