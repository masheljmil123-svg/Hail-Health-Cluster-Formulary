import { AlertOctagon, AlertTriangle, Biohazard, ShieldAlert } from 'lucide-react';
import { SAFETY_FLAG_LABEL } from '@/config/monograph';
import { cn } from '@/lib/cn';
import type { SafetyFlag } from '@/types';

const styles: Record<SafetyFlag, string> = {
  'high-alert': 'bg-rose-50 text-rose-800 ring-rose-200',
  lasa: 'bg-amber-50 text-amber-900 ring-amber-200',
  hazardous: 'bg-orange-50 text-orange-900 ring-orange-200',
};

const icons: Record<SafetyFlag, typeof AlertTriangle> = {
  'high-alert': AlertTriangle,
  lasa: ShieldAlert,
  hazardous: Biohazard,
};

export function SafetyBadges({
  flags,
  boxedWarning,
  className,
}: {
  flags: SafetyFlag[];
  boxedWarning?: boolean;
  className?: string;
}) {
  const items = [...flags];
  if (!items.length && !boxedWarning) return null;
  return (
    <ul className={cn('flex flex-wrap gap-2', className)} aria-label="Medication safety indicators">
      {boxedWarning && (
        <li className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900 ring-1 ring-rose-300">
          <AlertOctagon size={14} aria-hidden="true" />
          Boxed Warning
        </li>
      )}
      {items.map((flag) => {
        const Icon = icons[flag];
        return (
          <li
            key={flag}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1', styles[flag])}
          >
            <Icon size={14} aria-hidden="true" />
            {SAFETY_FLAG_LABEL[flag]}
          </li>
        );
      })}
    </ul>
  );
}
