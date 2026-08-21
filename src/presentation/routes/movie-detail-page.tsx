// presentation/routes/movie-detail-page.tsx — the shareable movie
// detail screen at `/movie/:id`.
//
// Responsibilities, on purpose:
//
//   1. Resolve the route param to a number. A non-numeric or
//      non-positive id is treated as "movie not found" — same
//      shape as a 404 from TMDB, so the page renders the empty
//      state with a "back" link rather than crashing.
//
//   2. Fetch the detail and the recommendations in parallel.
//      The detail uses `appendCastAndTrailers: true` so cast and
//      trailers come back in one round-trip; the recommendations
//      are a separate endpoint because TMDB returns them only
//      on demand.
//
//   3. Render the four states (loading, error, empty, success).
//      The "empty" state is the 404 case (no movie for this id).
//      The error state is a retry button.
//
//   4. Wire accessibility: the `<h1>` is the movie title, the
//      document title is the movie title, the focus moves to
//      the main heading on route change.
//
//   5. Show the synopsis with the English fallback when the
//      localized overview is missing.

import { useEffect, useRef, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { useMovieDetail } from '@/presentation/hooks/use-movie-detail';
import { useMovieRecommendations } from '@/presentation/hooks/use-movie-recommendations';
import { useImageConfig } from '@/presentation/hooks/use-image-config';
import { useLocale } from '@/presentation/hooks/use-locale';
import { useDocumentTitle } from '@/presentation/hooks/use-document-title';
import { MovieHero } from '@/presentation/components/feature/movie-hero';
import { MovieMetaPanel } from '@/presentation/components/feature/movie-meta-panel';
import { SaveToLibraryButton } from '@/presentation/components/feature/save-to-library-button';
import { SynopsisBlock } from '@/presentation/components/feature/synopsis-block';
import { CastList } from '@/presentation/components/feature/cast-list';
import { TrailerList } from '@/presentation/components/feature/trailer-list';
import { RecommendationRail } from '@/presentation/components/feature/recommendation-rail';
import { ErrorState } from '@/presentation/components/ui/error-state';
import { EmptyState } from '@/presentation/components/ui/empty-state';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { type LibraryEntry } from '@/domain/library/library-entry';
import { matchMovieState } from '@/domain/movie/movie-state';
import { matchRatingReliability } from '@/domain/rating/rating-reliability';
import { matchNoData } from '@/domain/shared/no-data';
import { copy } from '@/presentation/copy/strings';

function parseId(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function MovieDetailPage(): ReactNode {
  const params = useParams();
  const id = parseId(params.id);
  const locale = useLocale();
  const config = useImageConfig();
  const detail = useMovieDetail(id ?? undefined);
  const recs = useMovieRecommendations(id ?? undefined);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  useDocumentTitle(detail.data?.title ?? copy.detail.loading);

  // Move focus to the heading on successful load. The hook is
  // dependency-free on the ref because refs do not trigger
  // re-renders, and we want the focus to land exactly once per
  // successful id switch.
  useEffect(() => {
    if (detail.isSuccess) {
      headingRef.current?.focus();
    }
  }, [detail.isSuccess, detail.data?.id]);

  if (id === null) {
    return (
      <section data-testid="detail-not-found">
        <h1 className="text-3xl font-semibold text-ink">{copy.detail.notFoundTitle}</h1>
        <div className="mt-6">
          <EmptyState title={copy.detail.notFoundTitle} description={copy.detail.notFoundBody} />
        </div>
      </section>
    );
  }

  if (detail.isLoading) {
    return (
      <section
        aria-busy="true"
        aria-label={copy.detail.loadingAria}
        data-testid="detail-loading"
        className="flex flex-col gap-6"
      >
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{copy.detail.loading}</h1>
        <div className="flex flex-col gap-4 md:flex-row">
          <Skeleton variant="poster" className="w-full max-w-[18rem]" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton variant="text" className="h-8 w-3/4" />
            <Skeleton variant="text" className="h-4 w-1/2" />
            <Skeleton variant="text" className="h-4 w-1/3" />
          </div>
        </div>
        <Skeleton variant="text" className="h-32 w-full" />
      </section>
    );
  }

  if (detail.isError) {
    return (
      <section data-testid="detail-error">
        <h1 className="text-3xl font-semibold text-ink">{copy.detail.notFoundTitle}</h1>
        <div className="mt-6">
          <ErrorState
            title={copy.errors.title}
            description={copy.errors.description}
            action={{
              label: copy.errors.retry,
              onClick: () => {
                void detail.refetch();
              },
            }}
          />
        </div>
      </section>
    );
  }

  const movie = detail.data;
  if (movie === undefined) {
    return (
      <section data-testid="detail-not-found">
        <h1 className="text-3xl font-semibold text-ink">{copy.detail.notFoundTitle}</h1>
        <div className="mt-6">
          <EmptyState title={copy.detail.notFoundTitle} description={copy.detail.notFoundBody} />
        </div>
      </section>
    );
  }

  // TMDB returns a single `overview` field. The API layer
  // guarantees it is a non-null string, but it may be empty
  // (the movie has no synopsis) or in English only (no
  // localized version for the user's locale). For the MVP we
  // pass the same string to both slots and let the block
  // decide: empty → "no synopsis" view, present → "fallback"
  // view. A future iteration that tracks the requested locale
  // vs the response locale can split the two fields.
  const localizedOverview = movie.overview.trim() === '' ? null : movie.overview;
  const englishOverview = movie.overview.trim() === '' ? '' : movie.overview;

  // Build the library entry from the detail. The original title
  // is not on the detail response (it equals the title for
  // English-language movies), so we fall back to the title.
  const releaseDateString = matchMovieState(movie.state, {
    released: (d) => d.toISOString().slice(0, 10),
    unreleased: (d) => d.toISOString().slice(0, 10),
    unknown: () => '',
  });
  const releaseYear = matchMovieState(movie.state, {
    released: (d) => d.getUTCFullYear(),
    unreleased: (d) => d.getUTCFullYear(),
    unknown: () => null,
  });
  const voteAverage = matchRatingReliability(movie.rating, {
    consolidated: (_v, a) => a,
    early: (_v, a) => a,
    unknown: () => 0,
  });
  const voteCount = matchRatingReliability(movie.rating, {
    consolidated: (v) => v,
    early: (v) => v,
    unknown: () => 0,
  });

  const libraryEntry: LibraryEntry = {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.title,
    overview: movie.overview,
    releaseDate: releaseDateString,
    releaseYear,
    posterPath: movie.posterPath.kind === 'present' ? movie.posterPath.value : '',
    backdropPath: movie.backdropPath.kind === 'present' ? movie.backdropPath.value : '',
    voteAverage,
    voteCount,
    genreIds: movie.genreIds,
    savedAt: new Date().toISOString(),
  };

  return (
    <article data-testid="detail-page" className="flex flex-col gap-10">
      <MovieHero
        movie={movie}
        imageConfig={config.data?.images}
        locale={locale}
        headingRef={headingRef}
      />
      <div className="flex flex-col gap-3">
        <SaveToLibraryButton entry={libraryEntry} />
      </div>
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-10">
          <SynopsisBlock localized={localizedOverview} english={englishOverview} />
          <CastList
            cast={matchNoData(movie.cast, { absent: () => [], present: (v) => v })}
            imageConfig={config.data?.images}
          />
          <TrailerList
            trailers={matchNoData(movie.trailers, { absent: () => [], present: (v) => v })}
          />
        </div>
        <aside>
          <MovieMetaPanel movie={movie} locale={locale} />
        </aside>
      </div>
      <RecommendationRail
        movies={recs.data?.results ?? []}
        imageConfig={config.data?.images}
        locale={locale}
        loading={recs.isLoading}
      />
    </article>
  );
}
