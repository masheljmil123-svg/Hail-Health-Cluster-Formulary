import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { MedicationAlertClassification } from '@/types';

export function MedicationAlertBadge({
  classification,
  className,
}: {
  classification?: MedicationAlertClassification | null;
  className?: string;
}) {
  if (!classification || classification === 'unspecified') return null;

  if (classification === 'high-alert') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 ring-1 ring-rose-200',
          className,
        )}
        title="High Alert medication"
      >
        <AlertTriangle size={14} aria-hidden="true" />
        High Alert
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200',
        className,
      )}
      title="Low alert medication"
    >
      <CheckCircle2 size={14} aria-hidden="true" />
      Low
    </span>
  );
}
