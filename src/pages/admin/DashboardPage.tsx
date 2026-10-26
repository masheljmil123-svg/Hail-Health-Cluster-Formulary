import { ArrowUpRight, BookOpen, Calendar, ClipboardCheck, FileText, Layers, Pill, Ribbon, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HospitalPhoto } from '@/components/brand/HospitalPhoto';
import { formatDate, formatDateTime } from '@/lib/format';
import { useContent } from '@/hooks/useContent';
import { countWorkspaceQueue } from '@/services/deploymentStatus';
import { latestPublishedDate, totalRecords } from '@/services/library';
import { inBucket } from '@/services/search';
import type { AuditLogEntry } from '@/types';

const shortcuts = [
  {
    href: '/admin/drugs',
    title: 'Manage Drugs',
    text: 'Add medications, complete monographs, choose hospitals, then Save Draft or Publish.',
    icon: Pill,
    accent: 'bg-[#f3f8fd] text-[#145A91]',
  },
  {
    href: '/admin/review-requests',
    title: 'Review Requests',
    text: 'Review team submissions, edit if needed, then Request Changes or Approve & Publish.',
    icon: ClipboardCheck,
    accent: 'bg-[#eef6fb] text-[#145A91]',
  },
  {
    href: '/admin/therapeutic-classes',
    title: 'Therapeutic Classes',
    text: 'Organize classes and medication assignments for the Drug Index.',
    icon: Layers,
    accent: 'bg-[#eef6fb] text-[#1d6fa5]',
  },
  {
    href: '/admin/protocols',
    title: 'Protocols',
    text: 'Upload and manage therapeutic protocol records.',
    icon: FileText,
    accent: 'bg-[#f3faf6] text-[#12815f]',
  },
  {
    href: '/admin/guidelines',
    title: 'Guidelines',
    text: 'Add clinical practice guideline records.',
    icon: BookOpen,
    accent: 'bg-[#fdf8f1] text-[#c4842a]',
  },
  {
    href: '/admin/chemotherapy',
    title: 'Chemotherapy Protocols',
    text: 'Manage chemotherapy protocol catalog records.',
    icon: Ribbon,
    accent: 'bg-[#fff5f0] text-[#d97757]',
  },
  {
    href: '/admin/education',
    title: 'Patient Counseling Materials',
    text: 'Upload counseling documents and educational materials.',
    icon: Users,
    accent: 'bg-[#f7f5fc] text-[#7A5BB5]',
  },
  {
    href: '/admin/hospitals',
    title: 'Hospital Management',
    text: 'Edit hospital cards, names, and photographs for the welcome page.',
    icon: Layers,
    accent: 'bg-[#f3f8fd] text-[#145A91]',
  },
];

export function DashboardPage() {
  const { state } = useContent();
  const [range, setRange] = useState<'all' | '6m'>('all');
  const queue = useMemo(() => countWorkspaceQueue(state), [state]);
  const within = (date: string) => (range === '6m' ? inBucket(date, '6m') : true);
  const overview = [
    {
      label: 'Pending Reviews',
      value: queue.pendingReviews,
      href: '/admin/review-requests?status=pending',
      note: 'Team submissions awaiting administrator action',
      accent: 'bg-[#eef6fb] text-[#145A91]',
    },
    {
      label: 'Published locally',
      value: queue.readyForDeployment,
      href: '/admin/drugs?status=published',
      note: 'Visible in this browser’s hospital preview',
      accent: 'bg-emerald-50 text-emerald-800',
    },
    {
      label: 'Online catalog drugs',
      value: queue.livePublishedDrugs,
      href: '/admin/drugs?status=live',
      note: 'Present in the deployed repository catalog',
      accent: 'bg-indigo-50 text-indigo-800',
    },
    {
      label: 'Drafts',
      value: queue.drafts,
      href: '/admin/drugs?status=draft',
      note: 'Not submitted and not published',
      accent: 'bg-slate-100 text-slate-700',
    },
  ];
  const lastPublished = latestPublishedDate(state);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl">
        <HospitalPhoto variant="alternative" decorative className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-primary/45 to-primary/10" />
        <div className="relative flex min-h-[210px] flex-col justify-between gap-6 p-6 text-white sm:p-8 md:flex-row md:items-center">
          <div>
            <h1 className="font-serif text-[clamp(1.75rem,3vw,2.25rem)]">Admin Dashboard</h1>
            <p className="mt-2 max-w-xl text-white/85">
              Manage medications with Save Draft or Publish. Team submissions appear under Review Requests. Online visitors
              still need a Settings deployment.
            </p>
          </div>
          <div className="w-full max-w-xs rounded-2xl border border-white/25 bg-white/15 p-4 backdrop-blur-md">
            <div className="flex items-start justify-between border-b border-white/20 pb-3">
              <div>
                <p className="text-xs text-white/80">Last local approval date</p>
                <p className="mt-1 font-semibold">{lastPublished ? formatDate(lastPublished) : 'None yet'}</p>
              </div>
              <Calendar size={18} />
            </div>
            <div className="flex items-start justify-between pt-3">
              <div>
                <p className="text-xs text-white/80">Total workspace items</p>
                <p className="font-serif text-3xl">{totalRecords(state)}</p>
              </div>
              <FileText size={18} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.map((stat) => (
          <Link key={stat.label} to={stat.href} className={cnCard(stat.accent)}>
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium text-navy">{stat.label}</span>
              <ArrowUpRight size={16} />
            </span>
            <p className="mt-3 font-serif text-4xl text-navy">{stat.value}</p>
            <p className="mt-1 text-xs text-muted">{stat.note}</p>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Showing workspace activity {range === '6m' ? 'from the last 6 months' : 'for all dates'}.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm ${range === 'all' ? 'bg-navy text-white' : 'bg-white text-navy shadow-sm'}`}
            onClick={() => setRange('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm ${range === '6m' ? 'bg-navy text-white' : 'bg-white text-navy shadow-sm'}`}
            onClick={() => setRange('6m')}
          >
            6 months
          </button>
        </div>
      </div>

      <section>
        <h2 className="font-serif text-2xl text-navy">Content Management</h2>
        <p className="text-sm text-muted">Two clear paths: Review &amp; Publishing for team submissions, Manage Drugs for direct admin work.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((card) => (
            <article key={card.href} className="panel p-5">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${card.accent}`}>
                <card.icon size={18} />
              </span>
              <h3 className="mt-4 font-serif text-xl text-navy">{card.title}</h3>
              <p className="mt-2 min-h-16 text-sm leading-6 text-muted">{card.text}</p>
              <Link to={card.href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Open <ArrowUpRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl text-navy">Recent Activity</h2>
              <p className="text-sm text-muted">Latest local workspace changes.</p>
            </div>
            <Link to="/admin/activity" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {state.audit.filter((item) => within(item.timestamp.slice(0, 10))).slice(0, 8).map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
            {state.audit.length === 0 && <li className="py-6 text-sm text-muted">No activity yet.</li>}
          </ul>
        </div>
        <div className="panel space-y-4 p-6">
          <h2 className="font-serif text-2xl text-navy">Deployment reminder</h2>
          <p className="text-sm leading-6 text-muted">
            GitHub Pages visitors only see the repository published catalog. After approving content, open{' '}
            <Link to="/admin/review-publishing" className="font-medium text-primary hover:underline">
              Review &amp; Publishing
            </Link>{' '}
            and use <span className="font-semibold text-navy">Publish Changes (Export)</span>, then import and deploy.
          </p>
          <Link to="/admin/review-publishing" className="btn-primary inline-flex">
            Open Review &amp; Publishing
          </Link>
        </div>
      </section>
    </div>
  );
}

function ActivityRow({ entry }: { entry: AuditLogEntry }) {
  return (
    <li className="flex items-start justify-between gap-3 py-3 text-sm">
      <div>
        <p className="font-medium text-navy">
          {entry.actorLabel} {entry.action} {entry.targetLabel}
        </p>
        <p className="text-muted">{entry.targetType}</p>
      </div>
      <time className="shrink-0 text-xs text-muted">{formatDateTime(entry.timestamp)}</time>
    </li>
  );
}

function cnCard(accent: string) {
  return `panel block p-5 transition hover:-translate-y-0.5 hover:shadow-lift ${accent}`;
}
