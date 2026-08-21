// presentation/components/ui/skeleton.tsx — the loading placeholder.
//
// A skeleton must occupy the same space as the final content, so the
// grid does not jump when the data arrives. The "card" variant
// mirrors the three-tier MovieCard: the poster area keeps the
// 2:3 aspect ratio, and the text rows are sized to match the title
// (two lines) and the year/rating lines.

import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/presentation/lib/cn';

export type SkeletonVariant = 'text' | 'poster' | 'card' | 'block';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  readonly variant?: SkeletonVariant;
}

const BASE_CLASS = 'animate-pulse rounded-md bg-surface-raised';

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  // A single line of text. Use for one-line labels.
  text: 'h-4 w-full',
  // Just the 2:3 poster area. Use when the title and meta are
  // rendered separately and we only need to mask the image.
  poster: 'aspect-poster w-full rounded-card',
  // The full MovieCard silhouette. Use inside the explore grid so
  // the loading state has the same shape as the loaded state.
  card: 'flex flex-col gap-2 rounded-card border border-transparent p-3',
  // A generic block with a fixed height. Use for one-off sections
  // such as the filter bar.
  block: 'h-32 w-full',
};

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { variant = 'text', className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-hidden
      data-testid="skeleton"
      data-variant={variant}
      className={cn(BASE_CLASS, VARIANT_CLASS[variant], className)}
      {...rest}
    />
  );
});
