// presentation/components/ui/empty-state.tsx — the "nothing to show" panel.
//
// Used by every screen that has an empty state: the explore grid
// when the catalogue returns no rows, the home grid when the trending
// list is empty, and the search results when the query matches
// nothing. The optional `action` slot covers the "clear filters"
// button required by issue #13.

import type { ReactNode } from 'react';
import { cn } from '@/presentation/lib/cn';

export interface EmptyStateAction {
  readonly label: string;
  readonly onClick: () => void;
}

interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: EmptyStateAction;
  readonly children?: ReactNode;
  readonly className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps): ReactNode {
  return (
    <div
      role="status"
      data-testid="empty-state"
      className={cn(
        'flex flex-col items-center gap-3 rounded-card border border-ink-muted/20 bg-surface-raised px-6 py-12 text-center',
        className,
      )}
    >
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description !== undefined && (
        <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {children}
      {action !== undefined && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 inline-flex items-center justify-center rounded-card bg-brand px-5 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
