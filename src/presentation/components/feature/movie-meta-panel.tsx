// presentation/components/feature/movie-meta-panel.tsx — the side
// panel with budget, revenue, runtime, and status.
//
// Renders a 2-column key-value grid. Each row is its own data-testid
// so a test can assert on a single field without coupling to
// the others. Money and runtime are formatted in the domain;
// the panel just composes them.

import type { ReactNode } from 'react';
import { formatDuration } from '@/domain/format/duration';
import { formatMoney } from '@/domain/money/format-money';
import { type Money } from '@/domain/money/money';
import { type MovieDetail } from '@/domain/movie/movie-detail';
import { matchMovieState } from '@/domain/movie/movie-state';
import { type NoData, matchNoData } from '@/domain/shared/no-data';
import { copy } from '@/presentation/copy/strings';

export interface MovieMetaPanelProps {
  readonly movie: MovieDetail;
  readonly locale: string;
}

function statusLabel(state: MovieDetail['state']): string {
  return matchMovieState(state, {
    released: () => copy.detail.statusReleased,
    unreleased: () => copy.detail.statusUnreleased,
    unknown: () => copy.detail.statusUnknown,
  });
}

function moneyLabel(raw: NoData<Money>, locale: string): string {
  return matchNoData(raw, {
    absent: () => copy.detail.noData,
    present: (m) => formatMoney(m, { locale }),
  });
}

function runtimeLabel(raw: NoData<number>, locale: string): string {
  return matchNoData(raw, {
    absent: () => copy.detail.noData,
    present: (n) => formatDuration(n, { locale }),
  });
}

export function MovieMetaPanel({ movie, locale }: MovieMetaPanelProps): ReactNode {
  return (
    <dl
      data-testid="movie-meta-panel"
      className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm"
    >
      <dt className="text-ink-muted">{copy.detail.status}</dt>
      <dd className="text-ink" data-testid="meta-status">
        {statusLabel(movie.state)}
      </dd>
      <dt className="text-ink-muted">{copy.detail.runtime}</dt>
      <dd className="text-ink" data-testid="meta-runtime">
        {runtimeLabel(movie.runtime, locale)}
      </dd>
      <dt className="text-ink-muted">{copy.detail.budget}</dt>
      <dd className="text-ink" data-testid="meta-budget">
        {moneyLabel(movie.budget, locale)}
      </dd>
      <dt className="text-ink-muted">{copy.detail.revenue}</dt>
      <dd className="text-ink" data-testid="meta-revenue">
        {moneyLabel(movie.revenue, locale)}
      </dd>
    </dl>
  );
}
