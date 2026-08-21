// presentation/components/feature/save-to-library-button.tsx
//
// The button that toggles the "saved" state of a movie. Lives
// on the movie detail page and (in a future iteration) on the
// home and search cards.
//
// Optimistic update: clicking instantly flips the label and
// the underlying state; a failed storage write rolls the UI
// back via the hook's `onError` path. The button is disabled
// while the mutation is in flight to prevent double-clicks.

import { type ReactNode } from 'react';
import { type LibraryEntry } from '@/domain/library/library-entry';
import { useLibrary } from '@/presentation/hooks/use-library';
import { copy } from '@/presentation/copy/strings';
import { cn } from '@/presentation/lib/cn';

export interface SaveToLibraryButtonProps {
  readonly entry: LibraryEntry;
  /** The user-visible label when the movie is in the library. */
  readonly savedLabel?: string;
  /** The user-visible label when the movie is NOT in the library. */
  readonly saveLabel?: string;
  /** Tailwind class extension to override size/padding when
   *  the button is rendered in a small card. */
  readonly size?: 'sm' | 'md';
}

export function SaveToLibraryButton({
  entry,
  savedLabel = copy.library.saved,
  saveLabel = copy.library.addToLibrary,
  size = 'md',
}: SaveToLibraryButtonProps): ReactNode {
  const library = useLibrary();
  const isSaved = library.isInLibrary(entry.id);
  const isBusy = library.isSaving || library.isRemoving;

  function handleClick(): void {
    if (isBusy) return;
    if (isSaved) {
      void library.remove(entry.id);
    } else {
      void library.save(entry);
    }
  }

  const label = isSaved ? savedLabel : saveLabel;
  const testId = isSaved ? 'save-to-library-saved' : 'save-to-library';
  const variantClass = isSaved
    ? 'border-status-released/40 bg-status-released/10 text-status-released'
    : 'border-brand bg-brand text-surface hover:opacity-90';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      data-testid={testId}
      data-state={isSaved ? 'saved' : 'unsaved'}
      aria-pressed={isSaved}
      className={cn(
        'inline-flex items-center justify-center rounded-card border font-medium transition-opacity',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:cursor-progress disabled:opacity-50',
        size === 'sm' ? 'min-h-touch px-4 text-sm' : 'min-h-touch px-5 text-base',
        variantClass,
      )}
    >
      {isSaved ? '✓ ' : '+ '}
      {label}
    </button>
  );
}
