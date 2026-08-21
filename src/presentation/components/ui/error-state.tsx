// presentation/components/ui/error-state.tsx — the "we could not load
// this" panel.
//
// The optional `action` slot covers the "retry" button. The `role="alert"`
// attribute means screen readers announce the error as soon as it
// mounts, without the user having to navigate to the message.

import type { ReactNode } from 'react';
import { cn } from '@/presentation/lib/cn';

export interface ErrorStateAction {
  readonly label: string;
  readonly onClick: () => void;
}

interface ErrorStateProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ErrorStateAction;
  readonly className?: string;
}

export function ErrorState({ title, description, action, className }: ErrorStateProps): ReactNode {
  return (
    <div
      role="alert"
      data-testid="error-state"
      className={cn(
        'flex flex-col items-center gap-3 rounded-card border border-danger/40 bg-surface-raised px-6 py-12 text-center',
        className,
      )}
    >
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description !== undefined && (
        <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      )}
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
