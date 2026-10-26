import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Accessible dialog shell: max 90dvh, sticky header/footer, scrollable body.
 * Body scroll is locked while open; Escape closes.
 */
export function Modal({
  open,
  title,
  subtitle,
  children,
  footer,
  onClose,
  wide,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const titleId = useId();
  const subtitleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/40 p-3 sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        className={cn(
          'flex w-full max-h-[90dvh] flex-col overflow-hidden rounded-3xl bg-white shadow-lift',
          wide ? 'max-w-2xl' : 'max-w-md',
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-line/80 px-5 pb-3 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="font-serif text-2xl text-navy sm:text-[1.65rem]">
                {title}
              </h2>
              {subtitle && (
                <p id={subtitleId} className="mt-1 text-sm text-muted">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              ref={closeRef}
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-navy"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">{children}</div>

        {footer != null && (
          <footer className="shrink-0 border-t border-line/80 bg-white px-5 py-3 sm:px-6">{footer}</footer>
        )}
      </div>
    </div>
  );
}
