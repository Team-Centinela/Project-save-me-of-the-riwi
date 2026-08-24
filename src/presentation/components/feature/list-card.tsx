// presentation/components/feature/list-card.tsx — the card that
// summarizes one of the user's lists on the lists overview
// page.
//
// The card shows the name, the description (when present), and
// the movie count. It is a link to the list detail page so the
// entire card is the click target. The "delete" action lives on
// the detail page; the overview is read-only by design (a
// destructive action one click away from a list of cards is a
// footgun).

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { type List } from '@/domain/lists/list';
import { copy } from '@/presentation/copy/strings';
import { cn } from '@/presentation/lib/cn';

export interface ListCardProps {
  readonly list: List;
}

export function ListCard({ list }: ListCardProps): ReactNode {
  const movieCountLabel = copy.lists.movieIdsCount(list.movieIds.length);
  const accessibleName = `${list.name} (${movieCountLabel})`;
  return (
    <Link
      to={`/my-lists/${list.id}`}
      aria-label={accessibleName}
      className={cn(
        'group flex h-full flex-col gap-2 rounded-card border border-transparent bg-surface-raised p-4',
        'transition-colors hover:border-brand/40 focus-visible:border-brand focus-visible:outline-none',
      )}
    >
      <h3 className="line-clamp-2 text-base font-semibold text-ink">{list.name}</h3>
      {list.description !== '' && (
        <p className="line-clamp-2 text-sm text-ink-muted">{list.description}</p>
      )}
      <p className="mt-auto text-xs font-medium text-brand">{movieCountLabel}</p>
    </Link>
  );
}
