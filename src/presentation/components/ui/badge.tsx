// presentation/components/ui/badge.tsx — a small status pill.
//
// Three tones, mapped 1:1 to the catalog states (released,
// unreleased, unknown). The component is intentionally minimal:
// it is a presentational helper, not a smart UI primitive. Any
// status message that needs more than three values belongs in a
// dedicated section, not in a new badge tone.

import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/presentation/lib/cn';

export type BadgeTone = 'released' | 'unreleased' | 'unknown';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone: BadgeTone;
  readonly children: ReactNode;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  released: 'bg-status-released/15 text-status-released',
  unreleased: 'bg-status-unreleased/15 text-status-unreleased',
  unknown: 'bg-status-unknown/15 text-status-unknown',
};

export function Badge({ tone, children, className, ...rest }: BadgeProps): ReactNode {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        TONE_CLASS[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
