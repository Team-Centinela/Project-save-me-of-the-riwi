// presentation/components/feature/movie-hero.tsx — the detail page's
// header block.
//
// Layout: a back link on top, then a flex row with the poster on
// the left and the title + year + rating + status on the right.
// The status badge is rendered in addition to the color-coded
// release status so the "unreleased" message is conveyed by
// text, not color alone (per the WCAG 1.4.1 rule of thumb).

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { type ImageConfiguration, posterUrl } from '@/domain/configuration/image-configuration';
import { formatRatingAverage } from '@/domain/format/rating-average';
import { formatVoteCount } from '@/domain/format/vote-count';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { matchMovieState } from '@/domain/movie/movie-state';
import { matchRatingReliability } from '@/domain/rating/rating-reliability';
import { Badge } from '@/presentation/components/ui/badge';
import { copy } from '@/presentation/copy/strings';
import { cn } from '@/presentation/lib/cn';

export interface MovieHeroProps {
  readonly movie: MovieSummary;
  readonly imageConfig: ImageConfiguration | undefined;
  readonly locale: string;
  readonly backHref?: string;
  /** Optional ref for the <h1> element. Used by the detail page
   *  to move focus to the heading on successful load. */
  readonly headingRef?: React.Ref<HTMLHeadingElement>;
}

function formatRating(
  rating: MovieSummary['rating'],
  locale: string,
): {
  label: string;
  kind: 'consolidated' | 'early' | 'unknown';
} {
  return matchRatingReliability(rating, {
    consolidated: (_votes, average) => ({
      label: formatRatingAverage(average, locale),
      kind: 'consolidated',
    }),
    early: (_votes, average) => ({
      label: formatRatingAverage(average, locale),
      kind: 'early',
    }),
    unknown: () => ({ label: copy.movieCard.noRating, kind: 'unknown' }),
  });
}

function formatVotes(rating: MovieSummary['rating'], locale: string): string {
  if (rating.kind === 'unknown') return copy.format.voteCountAbsent;
  const formatted = formatVoteCount(rating.votes, locale);
  return copy.format.voteCount(formatted, rating.votes);
}

function releaseLine(state: MovieSummary['state']): { label: string; tone: BadgeTone } {
  return matchMovieState(state, {
    released: (date) => ({
      label: copy.detail.releasedOn(date.toISOString().slice(0, 10)),
      tone: 'released',
    }),
    unreleased: (date) => ({
      label: copy.detail.expectedOn(date.toISOString().slice(0, 10)),
      tone: 'unreleased',
    }),
    unknown: () => ({ label: copy.detail.statusUnknown, tone: 'unknown' }),
  });
}

type BadgeTone = 'released' | 'unreleased' | 'unknown';

export function MovieHero({
  movie,
  imageConfig,
  locale,
  backHref = '/',
  headingRef,
}: MovieHeroProps): ReactNode {
  const poster =
    imageConfig !== undefined
      ? posterUrl(imageConfig, movie.posterPath.kind === 'present' ? movie.posterPath.value : null)
      : null;
  const rating = formatRating(movie.rating, locale);
  const release = releaseLine(movie.state);
  const back = (
    <Link
      to={backHref}
      data-testid="movie-back-link"
      aria-label={copy.detail.backAria}
      className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span aria-hidden>←</span>
      {copy.detail.back}
    </Link>
  );

  return (
    <header className="flex flex-col gap-6" data-testid="movie-hero">
      {back}
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="aspect-poster w-full max-w-[18rem] shrink-0 overflow-hidden rounded-card bg-surface">
          {poster !== null ? (
            <img
              src={poster}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-full w-full items-center justify-center text-xs text-ink-muted"
            >
              {copy.movieCard.noPoster}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-3xl font-semibold tracking-tight text-ink"
            data-testid="movie-title"
            data-state-kind={movie.state.kind}
          >
            {movie.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <Badge tone={release.tone} data-testid="movie-status-badge">
              {release.label}
            </Badge>
            <span
              data-testid="movie-rating"
              data-rating-kind={rating.kind}
              className={cn(
                'text-rating font-semibold leading-(--text-rating--line-height)',
                rating.kind === 'consolidated' && 'text-status-released',
                rating.kind === 'early' && 'text-status-unreleased',
                rating.kind === 'unknown' && 'text-ink-muted',
              )}
            >
              {rating.label}
            </span>
            <span data-testid="movie-vote-count">({formatVotes(movie.rating, locale)})</span>
          </div>
        </div>
      </div>
    </header>
  );
}
