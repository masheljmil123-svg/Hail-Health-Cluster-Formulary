import { ArrowUpRight, BookOpen, Calendar, FileText, Layers, Pill, Ribbon, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HospitalPhoto } from '@/components/brand/HospitalPhoto';
import { formatDate, formatDateTime } from '@/lib/format';
import { useContent } from '@/hooks/useContent';
import { latestPublishedDate, publishedCount, totalRecords, updatedThisMonth } from '@/services/library';
import { inBucket } from '@/services/search';
import type { AuditLogEntry } from '@/types';

const shortcuts = [
  { href: '/admin/review-requests', title: 'Review Requests', text: 'Review team submissions, request changes, approve, and publish.', icon: FileText, accent: 'bg-[#eef6fb] text-[#145A91]' },
  { href: '/admin/drugs', title: 'Manage Drugs', text: 'Add new medications, edit existing content, and manage formulary status.', icon: Pill, accent: 'bg-[#f3f8fd] text-[#145A91]' },
  { href: '/admin/therapeutic-classes', title: 'Therapeutic Classes', text: 'Organize classes, subclasses, and medication assignments for the Drug Index.', icon: Layers, accent: 'bg-[#eef6fb] text-[#1d6fa5]' },
  { href: '/admin/protocols', title: 'Manage Protocols', text: 'Upload and manage therapeutic protocol records and pathways.', icon: FileText, accent: 'bg-[#f3faf6] text-[#12815f]' },
  { href: '/admin/guidelines', title: 'Manage Guidelines', text: 'Add clinical practice guideline records and evidence placeholders.', icon: BookOpen, accent: 'bg-[#fdf8f1] text-[#c4842a]' },
  { href: '/admin/chemotherapy', title: 'Manage Chemotherapy', text: 'Add chemotherapy protocol catalog records and optional PDF attachments.', icon: Ribbon, accent: 'bg-[#fff5f0] text-[#d97757]' },
  { href: '/admin/education', title: 'Manage Counseling Materials', text: 'Upload patient counseling documents and educational materials.', icon: Users, accent: 'bg-[#f7f5fc] text-[#7A5BB5]' },
  { href: '/admin/users', title: 'Users & Permissions', text: 'Invite team members and manage roles.', icon: Users, accent: 'bg-[#f3f8fd] text-[#145A91]' },
];

export function DashboardPage() {
  const { state } = useContent();
  const [range, setRange] = useState<'all' | '6m'>('all');
  const within = (date: string) => (range === '6m' ? inBucket(date, '6m') : true);
  const stats = useMemo(
    () => [
      { label: 'Drugs', value: state.drugs.filter((item) => item.status === 'published' && within(item.lastUpdated)).length, delta: updatedThisMonth(state.drugs), href: '/admin/drugs', icon: Pill, accent: 'bg-[#f3f8fd] text-[#145A91]', bar: '#3B82C4' },
      { label: 'Protocols', value: state.protocols.filter((item) => item.status === 'published' && within(item.lastUpdated)).length, delta: updatedThisMonth(state.protocols), href: '/admin/protocols', icon: FileText, accent: 'bg-[#f3faf6] text-[#12815f]', bar: '#3EAA7A' },
      { label: 'Guidelines', value: state.guidelines.filter((item) => item.status === 'published' && within(item.lastUpdated)).length, delta: updatedThisMonth(state.guidelines), href: '/admin/guidelines', icon: BookOpen, accent: 'bg-[#fdf8f1] text-[#c4842a]', bar: '#E0A15A' },
      { label: 'Chemotherapy', value: state.chemotherapy.filter((item) => item.status === 'published' && within(item.lastUpdated)).length, delta: updatedThisMonth(state.chemotherapy), href: '/admin/chemotherapy', icon: Ribbon, accent: 'bg-[#fff5f0] text-[#d97757]', bar: '#D97757' },
      { label: 'Counseling Materials', value: state.education.filter((item) => item.status === 'published' && within(item.lastUpdated)).length, delta: updatedThisMonth(state.education), href: '/admin/education', icon: Users, accent: 'bg-[#f7f5fc] text-[#7A5BB5]', bar: '#8B74C9' },
    ],
    [state, range],
  );
  const lastPublished = latestPublishedDate(state);
  const max = Math.max(...stats.map((item) => item.value), 1);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl">
        <HospitalPhoto variant="alternative" decorative className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-primary/45 to-primary/10" />
        <div className="relative flex min-h-[210px] flex-col justify-between gap-6 p-6 text-white sm:p-8 md:flex-row md:items-center">
          <div>
            <h1 className="font-serif text-4xl">Admin Dashboard</h1>
            <p className="mt-2 max-w-xl text-white/85">Manage formulary content, resources, and website sections.</p>
          </div>
          <div className="w-full max-w-xs rounded-2xl border border-white/25 bg-white/15 p-4 backdrop-blur-md">
            <div className="flex items-start justify-between border-b border-white/20 pb-3">
              <div>
                <p className="text-xs text-white/80">Last published</p>
                <p className="mt-1 font-semibold">{lastPublished ? formatDate(lastPublished) : 'None yet'}</p>
              </div>
              <Calendar size={18} />
            </div>
            <div className="flex items-start justify-between pt-3">
              <div>
                <p className="text-xs text-white/80">Total content items</p>
                <p className="font-serif text-3xl">{totalRecords(state)}</p>
              </div>
              <FileText size={18} />
            </div>
          </div>
        </div>
      </section>

      <p className="text-sm text-muted">
        Published counts reflect public content. Totals include drafts and pending review. Pending reviews:{' '}
        {[...state.drugs, ...state.protocols, ...state.guidelines, ...state.education, ...state.chemotherapy].filter(
          (item) => item.status === 'pending-review',
        ).length}
        .
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.href} className={cnCard(stat.accent)}>
            <span className="flex items-center justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-2xl bg-white/80 ${stat.accent.split(' ').slice(1).join(' ')}`}>
                <stat.icon size={18} />
              </span>
              <ArrowUpRight size={16} />
            </span>
            <p className="mt-4 text-sm text-muted">{stat.label}</p>
            <p className="font-serif text-4xl text-navy">{stat.value}</p>
            <p className={`text-xs ${stat.delta > 0 ? 'text-emerald-700' : 'text-muted'}`}>
              {stat.delta > 0 ? `+${stat.delta} published this month` : 'No new publications this month'}
            </p>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="font-serif text-2xl text-navy">Content Management</h2>
        <p className="text-sm text-muted">Add, edit, and organize formulary content.</p>
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
              <p className="text-sm text-muted">Latest changes made to the Hail Health Cluster Formulary.</p>
            </div>
            <Link to="/admin/activity" className="text-sm font-medium text-primary hover:underline">
              View all activity →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {state.audit.slice(0, 6).map((entry) => (
              <li key={entry.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4">
                <div>
                  <p className="text-sm font-medium text-navy">{sentence(entry)}</p>
                  <p className="text-xs text-muted">{entry.targetLabel}</p>
                </div>
                <p className="text-sm text-muted">{entry.actorLabel}</p>
                <time className="text-sm text-muted" dateTime={entry.timestamp}>
                  {formatDateTime(entry.timestamp)}
                </time>
              </li>
            ))}
            {state.audit.length === 0 && <li className="py-6 text-sm text-muted">No activity yet.</li>}
          </ul>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl text-navy">Content Overview</h2>
              <p className="text-sm text-muted">Published records by category.</p>
            </div>
            <label className="sr-only" htmlFor="chart-range">
              Chart range
            </label>
            <select id="chart-range" value={range} onChange={(event) => setRange(event.target.value as 'all' | '6m')} className="rounded-xl border border-line bg-white px-3 py-2 text-sm">
              <option value="all">All records</option>
              <option value="6m">Last 6 months</option>
            </select>
          </div>
          <div className="mt-6 flex h-56 items-end gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="flex h-full flex-1 flex-col items-center justify-end">
                <span className="mb-2 text-sm font-semibold text-navy">{stat.value}</span>
                <div className="w-full max-w-12 rounded-t-xl" style={{ height: `${Math.max(8, (stat.value / max) * 100)}%`, background: stat.bar }} />
                <span className="mt-2 text-center text-[11px] text-muted">{stat.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            Published now: {publishedCount(state.drugs)} drugs, {publishedCount(state.protocols)} protocols, {publishedCount(state.guidelines)} guidelines, {publishedCount(state.chemotherapy)} chemotherapy, {publishedCount(state.education)} counseling materials.
          </p>
        </div>
      </section>
    </div>
  );
}

function cnCard(accent: string): string {
  return `rounded-3xl p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift ${accent}`;
}

function sentence(entry: AuditLogEntry): string {
  const verbs: Record<AuditLogEntry['action'], string> = {
    created: 'Added',
    updated: 'Updated',
    archived: 'Archived',
    restored: 'Restored',
    deleted: 'Deleted',
    published: 'Published',
    reset: 'Reset',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    'changes-requested': 'Requested changes on',
  };
  return `${verbs[entry.action]} ${entry.targetType.replace('-', ' ')}`;
}
