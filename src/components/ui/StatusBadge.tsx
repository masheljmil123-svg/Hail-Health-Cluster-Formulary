import { AlertTriangle, CheckCircle2, CircleDashed, MinusCircle } from 'lucide-react';
import { formularyStatusLabel, publicationStatusLabel } from '@/config/site';
import { cn } from '@/lib/cn';
import type { FormularyStatus, PublicationStatus } from '@/types';

const formularyStyles: Record<FormularyStatus, string> = {
  preferred: 'bg-emerald-50 text-emerald-700',
  restricted: 'bg-amber-50 text-amber-700',
  'non-formulary': 'bg-slate-100 text-slate-600',
  pending: 'bg-sky-50 text-sky-800',
};

export function StatusBadge({ status }: { status: FormularyStatus }) {
  const Icon = status === 'preferred' ? CheckCircle2 : status === 'restricted' ? AlertTriangle : status === 'pending' ? CircleDashed : MinusCircle;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', formularyStyles[status])}>
      <Icon size={14} aria-hidden="true" />
      {formularyStatusLabel[status]}
    </span>
  );
}

const publicationStyles: Record<PublicationStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  'pending-review': 'bg-sky-50 text-sky-800',
  'changes-requested': 'bg-amber-50 text-amber-900',
  rejected: 'bg-rose-50 text-rose-800',
  approved: 'bg-indigo-50 text-indigo-800',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-slate-100 text-slate-600',
};

export function PublicationBadge({ status }: { status: PublicationStatus }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', publicationStyles[status])}>
      {publicationStatusLabel[status]}
    </span>
  );
}
