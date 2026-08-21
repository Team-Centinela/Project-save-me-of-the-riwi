// presentation/components/feature/trailer-list.tsx — the trailer
// section.
//
// Renders a YouTube-friendly link per trailer. The block only
// shows YouTube-hosted trailers because that is the only
// embeddable source for now; non-YouTube entries are kept in
// the domain and listed under "Other sites" without a link so
// the user can still see what TMDB returned.

import type { ReactNode } from 'react';
import { type Trailer } from '@/domain/movie/trailer';
import { copy } from '@/presentation/copy/strings';

export interface TrailerListProps {
  readonly trailers: readonly Trailer[];
}

function youtubeUrl(t: Trailer): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(t.key)}`;
}

export function TrailerList({ trailers }: TrailerListProps): ReactNode {
  const youtubeTrailers = trailers.filter((t) => t.site === 'YouTube');
  const otherTrailers = trailers.filter((t) => t.site !== 'YouTube');
  if (trailers.length === 0) {
    return (
      <section data-testid="trailers-empty" aria-labelledby="trailers-title">
        <h2 id="trailers-title" className="text-lg font-semibold text-ink">
          {copy.detail.trailers}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{copy.detail.noTrailers}</p>
      </section>
    );
  }
  return (
    <section data-testid="trailers-list" aria-labelledby="trailers-title">
      <h2 id="trailers-title" className="text-lg font-semibold text-ink">
        {copy.detail.trailers}
      </h2>
      {youtubeTrailers.length > 0 && (
        <ul className="mt-4 flex list-none flex-col gap-2 p-0" data-testid="trailers-rail">
          {youtubeTrailers.map((t) => (
            <li key={t.id} data-testid="trailer-item">
              <a
                href={youtubeUrl(t)}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-touch items-center gap-2 rounded-card border border-ink-muted/30 bg-surface-raised px-4 text-sm text-ink hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span aria-hidden>▶</span>
                <span>{t.name}</span>
                <span className="text-xs text-ink-muted">({t.type})</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {otherTrailers.length > 0 && (
        <ul className="mt-4 flex list-none flex-col gap-1 p-0 text-xs text-ink-muted">
          {otherTrailers.map((t) => (
            <li key={t.id}>
              {t.name} — {t.site}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
