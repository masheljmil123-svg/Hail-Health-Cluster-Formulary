import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/40 p-4 sm:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title" className="font-serif text-2xl text-navy">
          {title}
        </h2>
        <div className="mt-3 text-sm leading-6 text-muted">{children}</div>
        <button ref={closeRef} className="sr-only" onClick={onClose}>
          Close dialog
        </button>
      </div>
    </div>
  );
}
