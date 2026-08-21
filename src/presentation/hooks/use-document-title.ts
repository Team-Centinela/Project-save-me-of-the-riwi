// presentation/hooks/use-document-title.ts — set document.title on
// every render, restoring the previous title on unmount.
//
// The hook is intentionally tiny: a render-side effect, no
// dependencies, no global state. Used by the movie detail page
// to put the movie title in the tab title; used by every page
// to put the brand in the title when the page has no own title.

import { useEffect } from 'react';

const DEFAULT_TITLE = 'Cineteca';

export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.title;
    document.title = title === null || title === undefined || title === '' ? DEFAULT_TITLE : title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
