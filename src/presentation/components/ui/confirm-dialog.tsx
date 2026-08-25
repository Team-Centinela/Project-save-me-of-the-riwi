// presentation/components/ui/confirm-dialog.tsx — a small
// confirmation dialog for destructive actions.
//
// Accessibility contract (per issue #83):
//
//   - The dialog is a `role="alertdialog"` with an accessible
//     name (`aria-labelledby` → the title) and description
//     (`aria-describedby` → the body), so screen readers announce
//     what is being asked before any button is reached.
//   - Initial focus lands on the **Cancel** button — the safe
//     default for a destructive action: an accidental Enter or
//     Space cancels instead of confirming.
//   - Tab / Shift+Tab cycle inside the dialog only (focus trap).
//   - Escape closes the dialog without confirming.
//   - When the dialog closes, focus returns to the element that
//     was focused before it opened.
//
// The component renders nothing when closed. It owns no state:
// the parent decides when it is open and what confirming means.

import { useEffect, useRef } from 'react';
import { type ReactNode } from 'react';
import { useId } from 'react';
import { copy } from '@/presentation/copy/strings';

export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly body: ReactNode;
  readonly confirmLabel: string;
  /** Accessible name for the confirm button; names what will be destroyed. */
  readonly confirmAriaLabel?: string;
  readonly cancelLabel?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

function focusables(container: HTMLElement): HTMLElement[] {
  // Scope: a confirm dialog's own controls (two buttons today).
  // The selector still honours any focusable the parent renders
  // into these slots, including `[tabindex]`-enabled elements.
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  confirmAriaLabel,
  cancelLabel = copy.lists.cancel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactNode {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  // The element to restore focus to when the dialog closes.
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  // Stashed so the keydown listener below can depend on `[open]`
  // alone: parents typically pass an inline `onCancel`, and a dep
  // on the prop itself would re-attach the document listener on
  // every parent render while the dialog is open.
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [open]);

  // Focus trap + Escape handling live on `document` while the
  // dialog is open, so the overlay div stays free of interactive
  // semantics (the dialog itself only contains real buttons).
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancelRef.current();
        return;
      }
      if (event.key !== 'Tab' || dialogRef.current === null) return;
      const elements = focusables(dialogRef.current);
      const first = elements.at(0);
      const last = elements.at(-1);
      if (first === undefined || last === undefined) return;
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-ink/40" />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="relative flex w-full max-w-md flex-col gap-4 rounded-card border border-ink-muted/20 bg-surface-raised p-6"
      >
        <h2 id={titleId} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <p id={bodyId} className="text-sm text-ink-muted">
          {body}
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-touch items-center justify-center rounded-card border border-ink-muted/30 px-5 text-sm font-medium text-ink transition-colors hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            aria-label={confirmAriaLabel ?? confirmLabel}
            className="inline-flex min-h-touch items-center justify-center rounded-card border border-danger/40 bg-danger px-5 text-sm font-medium text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
