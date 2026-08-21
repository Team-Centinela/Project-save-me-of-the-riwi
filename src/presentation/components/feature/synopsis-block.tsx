// presentation/components/feature/synopsis-block.tsx — the overview
// section of the detail page.
//
// Two responsibilities, on purpose:
//
//   1. Render the overview text. TMDB always returns an
//      `overview` field, but it is sometimes empty (the movie
//      has no synopsis) or in English only (no localised
//      version for the user's locale). The block distinguishes
//      "no synopsis" from "English fallback" with separate
//      copy and a separate data-testid so a test can assert
//      each branch.
//
//   2. The fallback notice ("Showing the English version:") is
//      rendered above the English text, not inline, so a screen
//      reader announces the change of language before the body.

import type { ReactNode } from 'react';
import { matchNoData } from '@/domain/shared/no-data';
import { type NoData } from '@/domain/shared/no-data';
import { copy } from '@/presentation/copy/strings';

export interface SynopsisBlockProps {
  /** The localized overview from the TMDB detail response. The
   *  empty string means "no synopsis"; `null` means "no localized
   *  version, please fall back to English". */
  readonly localized: string | null;
  /** The English overview, used as a fallback when `localized`
   *  is null. */
  readonly english: string;
}

export function SynopsisBlock({ localized, english }: SynopsisBlockProps): ReactNode {
  // Three branches, in priority order:
  //  1. The localized overview is present and non-empty → render it.
  //  2. The localized is missing/empty but the English is present
  //     → render the fallback notice above the English body.
  //  3. Both are empty → render the "no synopsis" view.
  const hasLocalized = localized !== null && localized.trim() !== '';
  const hasEnglish = english.trim() !== '';
  if (hasLocalized) {
    return (
      <section data-testid="synopsis-localized" aria-labelledby="synopsis-title">
        <h2 id="synopsis-title" className="text-lg font-semibold text-ink">
          {copy.detail.overviewLabel}
        </h2>
        <p className="mt-2 text-base text-ink" data-testid="synopsis-body">
          {localized}
        </p>
      </section>
    );
  }
  if (hasEnglish) {
    return (
      <section data-testid="synopsis-fallback" aria-labelledby="synopsis-title">
        <h2 id="synopsis-title" className="text-lg font-semibold text-ink">
          {copy.detail.overviewLabel}
        </h2>
        <p className="mt-2 text-sm text-status-unreleased" data-testid="synopsis-fallback-notice">
          {copy.detail.overviewEnglishFallback}
        </p>
        <p className="mt-2 text-base text-ink" data-testid="synopsis-body">
          {english}
        </p>
      </section>
    );
  }
  return (
    <section data-testid="synopsis-empty" aria-labelledby="synopsis-title">
      <h2 id="synopsis-title" className="text-lg font-semibold text-ink">
        {copy.detail.overviewLabel}
      </h2>
      <p className="mt-2 text-sm text-ink-muted">{copy.detail.noOverview}</p>
    </section>
  );
}

// Re-export to keep the unused-import warning quiet when the
// page passes a NoData<string> through a custom prop. Useful for
// the detail page which composes the block from the MovieDetail.
export type { NoData };
// matchNoData is intentionally re-exported through the type
// above; the function is used by callers that want to fold over
// NoData before passing the result into the block.
void matchNoData;
