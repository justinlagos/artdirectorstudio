import React, { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Small centered confirm dialog. Board visible behind.
 * Focus trapped inside while open. Escape closes.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap + escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
      // Focus trap: Tab cycles within dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus the cancel button (secondary action = safe default)
    const timer = setTimeout(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop - board visible behind */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onCancel} />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative z-10 w-[280px] p-5 rounded-[var(--sw-radius-panel)] bg-neutral-900 border border-white/10 shadow-[var(--sw-shadow-float)]"
      >
        <h3 className="text-sm font-medium text-white/90 mb-1">{title}</h3>
        <p className="text-xs text-white/50 mb-5 leading-relaxed">{body}</p>

        <div className="flex gap-2">
          <button
            data-cancel
            onClick={onCancel}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-medium transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              destructive
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                : 'bg-[var(--sw-accent)] hover:bg-[var(--sw-accent)]/90 text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
