import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PROFESSIONAL_DESIGNATION_LABEL } from '@/config/professionalDesignations';
import { useContent } from '@/hooks/useContent';
import { formatDateTime } from '@/lib/format';
import { loadAccounts } from '@/services/accounts';
import {
  analyticsFiltersToSearchParams,
  computeAnalyticsKpis,
  contentTypeChart,
  enrichAuditEvents,
  hospitalContributionChart,
  monthlyContentActivity,
  parseAnalyticsFilters,
  pharmacyTeamOverview,
  reviewStatusChart,
  statusFilterHref,
  teamContributionChart,
  type AnalyticsDatePreset,
  type AnalyticsFilters,
} from '@/services/analytics';
import { sortedHospitals } from '@/services/hospitals';
import type { ProfessionalDesignation } from '@/types';

const CHART_COLORS = ['#145A91', '#2AA0AA', '#3EAA7A', '#E0A15A', '#D97757', '#8B74C9', '#64748b'];

export function ActivityPage() {
  const { state } = useContent();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const accounts = useMemo(() => loadAccounts(), [state.audit.length, state.drugs.length]);
  const filters = useMemo(() => parseAnalyticsFilters(params), [params]);
  const [monthSpan, setMonthSpan] = useState<6 | 12>(6);
  const [activityQuery, setActivityQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const kpis = useMemo(() => computeAnalyticsKpis(state, accounts, filters), [state, accounts, filters]);
  const hospitalChart = useMemo(() => hospitalContributionChart(state, accounts, filters), [state, accounts, filters]);
  const statusChart = useMemo(() => reviewStatusChart(state), [state]);
  const monthlyChart = useMemo(() => monthlyContentActivity(state, monthSpan), [state, monthSpan]);
  const contributorChart = useMemo(() => teamContributionChart(state, accounts, filters), [state, accounts, filters]);
  const typeChart = useMemo(() => contentTypeChart(state, accounts, filters), [state, accounts, filters]);
  const teamRows = useMemo(() => pharmacyTeamOverview(state, accounts, filters), [state, accounts, filters]);
  const events = useMemo(() => enrichAuditEvents(state, accounts, filters), [state, accounts, filters]);
  const hospitals = sortedHospitals(state.hospitals ?? []);

  const filteredEvents = useMemo(() => {
    const needle = activityQuery.trim().toLowerCase();
    if (!needle) return events;
    return events.filter((event) =>
      `${event.actorDisplayName} ${event.targetLabel} ${event.actionLabel} ${event.hospitalName}`
        .toLowerCase()
        .includes(needle),
    );
  }, [events, activityQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const pageEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);

  function updateFilters(next: Partial<AnalyticsFilters>) {
    const merged = { ...filters, ...next };
    setParams(analyticsFiltersToSearchParams(merged), { replace: true });
    setPage(1);
  }

  function resetFilters() {
    setParams(new URLSearchParams(), { replace: true });
    setActivityQuery('');
    setPage(1);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-navy">Activity &amp; Analytics</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Local workspace metrics for this browser only. Counts come from IndexedDB content, local accounts, audit events,
            and the repository published catalog. This is not a synchronized hospital-wide staff analytics system.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={resetFilters}>
          Reset Filters
        </button>
      </div>

      <section className="panel grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        <FilterField label="Hospital">
          <select
            className="ui-input"
            value={filters.hospitalId}
            onChange={(event) => updateFilters({ hospitalId: event.target.value })}
          >
            <option value="">All hospitals</option>
            {hospitals.map((hospital) => (
              <option key={hospital.id} value={hospital.id}>
                {hospital.nameEn}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Date range">
          <select
            className="ui-input"
            value={filters.datePreset}
            onChange={(event) => updateFilters({ datePreset: event.target.value as AnalyticsDatePreset })}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="year">This year</option>
            <option value="custom">Custom range</option>
            <option value="all">All time</option>
          </select>
        </FilterField>
        {filters.datePreset === 'custom' && (
          <>
            <FilterField label="From">
              <input
                type="date"
                className="ui-input"
                value={filters.customFrom ?? ''}
                onChange={(event) => updateFilters({ customFrom: event.target.value })}
              />
            </FilterField>
            <FilterField label="To">
              <input
                type="date"
                className="ui-input"
                value={filters.customTo ?? ''}
                onChange={(event) => updateFilters({ customTo: event.target.value })}
              />
            </FilterField>
          </>
        )}
        <FilterField label="User / Contributor">
          <select
            className="ui-input"
            value={filters.actorId}
            onChange={(event) => updateFilters({ actorId: event.target.value })}
          >
            <option value="">All contributors</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.displayName}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Professional designation">
          <select
            className="ui-input"
            value={filters.designation}
            onChange={(event) =>
              updateFilters({ designation: event.target.value as ProfessionalDesignation | 'all' })
            }
          >
            <option value="all">All designations</option>
            {(Object.keys(PROFESSIONAL_DESIGNATION_LABEL) as ProfessionalDesignation[]).map((key) => (
              <option key={key} value={key}>
                {PROFESSIONAL_DESIGNATION_LABEL[key]}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Activity type">
          <select
            className="ui-input"
            value={filters.activityType}
            onChange={(event) => updateFilters({ activityType: event.target.value as AnalyticsFilters['activityType'] })}
          >
            <option value="all">All actions</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="published">Prepared / Published</option>
            <option value="changes-requested">Changes requested</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
            <option value="deleted">Deleted</option>
          </select>
        </FilterField>
        <FilterField label="Content type">
          <select
            className="ui-input"
            value={filters.contentType}
            onChange={(event) => updateFilters({ contentType: event.target.value as AnalyticsFilters['contentType'] })}
          >
            <option value="all">All content</option>
            <option value="drug">Drugs</option>
            <option value="protocol">Protocols</option>
            <option value="guideline">Guidelines</option>
            <option value="chemotherapy">Chemotherapy</option>
            <option value="education">Counseling materials</option>
          </select>
        </FilterField>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pending Review Requests"
          value={String(kpis.pendingReviews)}
          hint="Awaiting administrator review"
          to="/admin/review-requests?status=pending"
        />
        <KpiCard
          label="Approved Medications"
          value={String(kpis.approvedMedications)}
          hint="Unique drugs with approved/ready status"
          to="/admin/drugs?status=published"
        />
        <KpiCard
          label="Published Medications"
          value={String(kpis.publishedMedications)}
          hint="In repository published catalog only"
          to="/admin/drugs?status=live"
        />
        <KpiCard
          label="Total Medication Submissions"
          value={String(kpis.medicationSubmissions)}
          hint="Create/submit events in selected range"
          to="/admin/activity?activity=submitted&type=drug"
        />
        <KpiCard
          label="Registered Pharmacy Professionals"
          value={kpis.registeredPharmacyProfessionals === null ? 'Not available' : String(kpis.registeredPharmacyProfessionals)}
          hint="From local profile designations only"
          to="/admin/users?profession=pharmacy"
        />
        <KpiCard
          label="Active Contributors"
          value={String(kpis.activeContributors)}
          hint="Unique actors with recorded events"
          to="/admin/activity?range=30d"
        />
        <button
          type="button"
          onClick={() => navigate(kpis.latestMedicationContributor?.href ?? '/admin/drugs')}
          className="panel col-span-full block p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift xl:col-span-2"
        >
          <p className="text-sm font-medium text-muted">Latest Medication Contributor</p>
          {kpis.latestMedicationContributor ? (
            <>
              <p className="mt-2 font-serif text-2xl text-navy">{kpis.latestMedicationContributor.displayName}</p>
              <p className="mt-1 text-sm text-muted">
                {kpis.latestMedicationContributor.professionalDesignation} ·{' '}
                {kpis.latestMedicationContributor.hospitalName}
              </p>
              <p className="mt-2 text-sm text-navy">
                {kpis.latestMedicationContributor.medicationTitle}
                <span className="text-muted"> · {formatDateTime(kpis.latestMedicationContributor.timestamp)}</span>
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Data unavailable for the selected filters.</p>
          )}
        </button>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Medication Contributions by Hospital" subtitle="Assigned unique drugs vs submission events">
          {hospitalChart.every((row) => row.uniqueAssignedMedications === 0 && row.submissionEvents === 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hospitalChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="nameEn" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="uniqueAssignedMedications"
                  name="Unique assigned medications"
                  fill="#145A91"
                  radius={[8, 8, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    const hospitalId = (data as { hospitalId?: string })?.hospitalId;
                    if (hospitalId) updateFilters({ hospitalId });
                  }}
                />
                <Bar
                  dataKey="submissionEvents"
                  name="Submission events"
                  fill="#2AA0AA"
                  radius={[8, 8, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    const hospitalId = (data as { hospitalId?: string })?.hospitalId;
                    if (hospitalId) updateFilters({ hospitalId, activityType: 'submitted', contentType: 'drug' });
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Review Requests by Status" subtitle="Current editorial queue (workspace)">
          {statusChart.every((slice) => slice.count === 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusChart}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  cursor="pointer"
                  onClick={(_, index) => {
                    const slice = statusChart[index];
                    if (slice) navigate(statusFilterHref(slice.status));
                  }}
                >
                  {statusChart.map((slice, index) => (
                    <Cell key={slice.status} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Monthly Content Activity"
          subtitle="Audit events by month"
          action={
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs ${monthSpan === 6 ? 'bg-navy text-white' : 'bg-canvas text-navy'}`}
                onClick={() => setMonthSpan(6)}
              >
                6 months
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs ${monthSpan === 12 ? 'bg-navy text-white' : 'bg-canvas text-navy'}`}
                onClick={() => setMonthSpan(12)}
              >
                12 months
              </button>
            </div>
          }
        >
          {monthlyChart.every((row) => row.created + row.submitted + row.approved + row.published === 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" name="Created" stroke="#145A91" strokeWidth={2} />
                <Line type="monotone" dataKey="submitted" name="Submitted" stroke="#2AA0AA" strokeWidth={2} />
                <Line type="monotone" dataKey="approved" name="Approved" stroke="#3EAA7A" strokeWidth={2} />
                <Line type="monotone" dataKey="published" name="Prepared / Published" stroke="#E0A15A" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Team Contributions" subtitle="Medication create/submit events by contributor">
          {contributorChart.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={contributorChart.slice(0, 8)} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="displayName" width={110} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, _name, item) => [
                    value,
                    `${(item?.payload as { professionalDesignation?: string })?.professionalDesignation ?? ''} · ${(item?.payload as { hospitalName?: string })?.hospitalName ?? ''}`,
                  ]}
                />
                <Bar
                  dataKey="submissions"
                  name="Submissions"
                  fill="#145A91"
                  radius={[0, 8, 8, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    const actorId = (data as { actorId?: string })?.actorId;
                    if (actorId) updateFilters({ actorId, contentType: 'drug', activityType: 'submitted' });
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Content Types" subtitle="Audit activity distribution" className="xl:col-span-2">
          {typeChart.every((slice) => slice.count === 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={typeChart}
                  dataKey="count"
                  nameKey="label"
                  outerRadius={100}
                  paddingAngle={2}
                  cursor="pointer"
                  onClick={(_, index) => {
                    const slice = typeChart[index];
                    if (slice) updateFilters({ contentType: slice.type as AnalyticsFilters['contentType'] });
                  }}
                >
                  {typeChart.map((slice, index) => (
                    <Cell key={slice.type} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-3xl text-navy">Pharmacy Team Overview</h2>
          <p className="mt-1 text-sm text-muted">
            Local browser accounts only. Professional designation is never inferred from system role.
          </p>
        </div>
        {teamRows.length === 0 ? (
          <div className="panel p-6 text-sm text-muted">No local user profiles available for this filter set.</div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-line bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-clinical/60 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Display name</th>
                  <th className="px-4 py-3">Professional designation</th>
                  <th className="px-4 py-3">Hospital</th>
                  <th className="px-4 py-3">App role</th>
                  <th className="px-4 py-3">Medications submitted</th>
                  <th className="px-4 py-3">Approvals recorded</th>
                  <th className="px-4 py-3">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {teamRows.map((row) => (
                  <tr key={row.accountId} className="hover:bg-clinical/30">
                    <td className="px-4 py-3">
                      <Link className="font-medium text-primary hover:underline" to={`/admin/activity?actor=${row.accountId}`}>
                        {row.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.professionalDesignation}</td>
                    <td className="px-4 py-3">{row.hospitalName}</td>
                    <td className="px-4 py-3">{row.role}</td>
                    <td className="px-4 py-3">{row.medicationsSubmitted}</td>
                    <td className="px-4 py-3">{row.requestsApproved}</td>
                    <td className="px-4 py-3 text-muted">
                      {row.lastActivityAt ? formatDateTime(row.lastActivityAt) : 'Data unavailable'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl text-navy">Recent Activity Timeline</h2>
            <p className="mt-1 text-sm text-muted">
              Chronological workspace audit history. Not a tamper-proof clinical audit trail.
            </p>
          </div>
          <input
            className="ui-input sm:max-w-xs"
            value={activityQuery}
            onChange={(event) => {
              setActivityQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search activity…"
          />
        </div>

        <ul className="space-y-3">
          {pageEvents.length === 0 && <li className="panel p-6 text-sm text-muted">No activity matches these filters.</li>}
          {pageEvents.map((event) => (
            <li key={event.id}>
              <Link
                to={event.href}
                className="panel flex flex-col gap-2 p-4 transition hover:border-primary/30 hover:shadow-lift sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-navy">
                    {event.actionLabel} · {event.targetLabel}
                  </p>
                  <p className="text-sm text-muted">
                    {event.actorDisplayName} · {event.actorRole} · {event.professionalDesignation} · {event.hospitalName}
                  </p>
                  <p className="text-xs text-muted">{event.targetType}</p>
                </div>
                <time className="shrink-0 text-sm text-muted" dateTime={event.timestamp}>
                  {formatDateTime(event.timestamp)}
                </time>
              </Link>
            </li>
          ))}
        </ul>

        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </button>
            <p className="text-sm text-muted">
              Page {page} of {pageCount}
            </p>
            <button
              type="button"
              className="btn-secondary"
              disabled={page >= pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="ui-label">{label}</span>
      {children}
    </label>
  );
}

function KpiCard({
  label,
  value,
  hint,
  to,
}: {
  label: string;
  value: string;
  hint: string;
  to: string;
}) {
  return (
    <Link to={to} className="panel block p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 font-serif text-4xl text-navy">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </Link>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  action,
  className = '',
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <article className={`panel p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-navy">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </article>
  );
}

function EmptyChart() {
  return (
    <div className="grid h-[280px] place-items-center rounded-2xl bg-canvas text-sm text-muted">
      Data unavailable for the selected filters.
    </div>
  );
}
