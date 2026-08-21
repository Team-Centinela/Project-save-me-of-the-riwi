// presentation/components/feature/movie-grid.tsx — the explore grid.
//
// Renders a responsive grid of MovieCards. The list can hold
// thousands of rows (TMDB caps the catalogue at 500 pages × 20
// results per page), so the grid is virtualized: only the visible
// rows are mounted, and the scroll position drives which ones.
//
// The column count is fluid — 2 columns on mobile, 6 on wide
// screens. The virtualizer needs a predictable row height, so the
// component measures the container's width with a `ResizeObserver`
// and computes the row height from the column width, the poster's
// 2:3 aspect, and the text area below.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type ImageConfiguration } from '@/domain/configuration/image-configuration';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { MovieCard } from '@/presentation/components/feature/movie-card';
import { cn } from '@/presentation/lib/cn';

const GAP_PX = 16;
/** Approximate height of the text area below the poster: two
 *  title lines, the year, and the rating. */
const TEXT_AREA_PX = 80;

const BREAKPOINTS: readonly { readonly minWidth: number; readonly columns: number }[] = [
  { minWidth: 1536, columns: 6 },
  { minWidth: 1280, columns: 5 },
  { minWidth: 1024, columns: 4 },
  { minWidth: 768, columns: 3 },
  { minWidth: 0, columns: 2 },
];

function columnsForWidth(width: number): number {
  for (const bp of BREAKPOINTS) {
    if (width >= bp.minWidth) return bp.columns;
  }
  return 2;
}

function rowHeightFor(width: number, columns: number): number {
  const totalGaps = GAP_PX * (columns - 1);
  const columnWidth = Math.max(0, (width - totalGaps) / columns);
  const posterHeight = columnWidth * 1.5;
  return Math.ceil(posterHeight + TEXT_AREA_PX + GAP_PX);
}

export interface MovieGridProps {
  readonly movies: readonly MovieSummary[];
  readonly imageConfig: ImageConfiguration | undefined;
  readonly locale: string;
  /** Tailwind height class for the scroll container. Defaults to a
   *  viewport-sized scroller so a thousand-row list does not push
   *  the filter bar off the screen. */
  readonly heightClass?: string;
}

export function MovieGrid({
  movies,
  imageConfig,
  locale,
  heightClass = 'h-[calc(100vh-22rem)]',
}: MovieGridProps): ReactNode {
  const parentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = parentRef.current;
    if (node === null) return;
    const update = () => {
      setWidth(node.clientWidth);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  const columns = columnsForWidth(width);
  const rowHeight = rowHeightFor(width, columns);
  const rows = useMemo(() => {
    const chunked: MovieSummary[][] = [];
    for (let i = 0; i < movies.length; i += columns) {
      chunked.push(movies.slice(i, i + columns));
    }
    return chunked;
  }, [movies, columns]);

  // TanStack Virtual's `useVirtualizer()` is intentionally not memoizable.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 4,
  });

  // Re-measure when the row height changes (column count changed)
  // or after the first paint (so the virtualizer picks up the
  // scroll element, which is null on the first render).
  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight, virtualizer, width]);

  return (
    <div
      ref={parentRef}
      data-testid="movie-grid"
      data-row-count={rows.length}
      data-column-count={columns}
      className={cn('relative overflow-auto', heightClass)}
    >
      <div
        style={{ height: `${String(virtualizer.getTotalSize())}px`, position: 'relative' }}
        data-testid="movie-grid-inner"
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (row === undefined) return null;
          return (
            <div
              key={virtualRow.key}
              data-testid="movie-grid-row"
              data-row-index={virtualRow.index}
              className="absolute left-0 right-0 grid gap-4 px-0"
              style={{
                top: `${String(virtualRow.start)}px`,
                height: `${String(virtualRow.size)}px`,
                gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))`,
              }}
            >
              {row.map((movie) => (
                <MovieCard key={movie.id} movie={movie} imageConfig={imageConfig} locale={locale} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
