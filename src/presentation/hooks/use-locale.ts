// presentation/hooks/use-locale.ts — read the user's browser locale.
//
// A presentation-only hook, no providers needed. The locale is
// detected once on mount and stored in a ref so re-renders do not
// re-read `navigator.language` (which can change at runtime when
// the user switches OS language, but the page does not need to
// follow that change without a reload).

import { useMemo } from 'react';

function detectLocale(): string {
  if (typeof navigator !== 'undefined' && typeof navigator.language === 'string') {
    const lang = navigator.language.trim();
    if (lang !== '') return lang;
  }
  return 'en-US';
}

export function useLocale(): string {
  return useMemo(() => detectLocale(), []);
}
