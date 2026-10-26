import { publishedCatalog } from '@/data/published/catalog';
import { PROFESSIONAL_DESIGNATION_LABEL, isPharmacyProfessional } from '@/config/professionalDesignations';
import { isReadyForDeployment } from '@/services/deploymentStatus';
import { sortedHospitals } from '@/services/hospitals';
import type {
  AuditLogEntry,
  ContentKind,
  ContentState,
  Hospital,
  ProfessionalDesignation,
  PublicationStatus,
  TeamAccount,
} from '@/types';

export type AnalyticsDatePreset = '7d' | '30d' | '90d' | 'year' | 'custom' | 'all';

export type AnalyticsActivityType =
  | 'all'
  | 'created'
  | 'updated'
  | 'submitted'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'changes-requested'
  | 'archived'
  | 'deleted';

export type AnalyticsContentType = 'all' | ContentKind;

export interface AnalyticsFilters {
  hospitalId: string; // '' = all
  datePreset: AnalyticsDatePreset;
  customFrom?: string;
  customTo?: string;
  actorId: string; // '' = all
  designation: ProfessionalDesignation | 'all';
  activityType: AnalyticsActivityType;
  contentType: AnalyticsContentType;
}

export interface AnalyticsKpis {
  pendingReviews: number;
  approvedMedications: number;
  publishedMedications: number;
  medicationSubmissions: number;
  registeredPharmacyProfessionals: number | null;
  activeContributors: number;
  latestMedicationContributor: LatestContributor | null;
}

export interface LatestContributor {
  displayName: string;
  professionalDesignation: string;
  hospitalName: string;
  medicationTitle: string;
  timestamp: string;
  drugId?: string;
  actorId?: string;
  href: string;
}

export interface HospitalContributionRow {
  hospitalId: string;
  nameEn: string;
  uniqueAssignedMedications: number;
  submissionEvents: number;
}

export interface StatusSlice {
  status: string;
  label: string;
  count: number;
}

export interface MonthlyActivityRow {
  month: string;
  created: number;
  submitted: number;
  approved: number;
  published: number;
}

export interface ContributorRankRow {
  actorKey: string;
  displayName: string;
  professionalDesignation: string;
  hospitalName: string;
  submissions: number;
  actorId?: string;
}

export interface ContentTypeSlice {
  type: string;
  label: string;
  count: number;
}

export interface TeamOverviewRow {
  accountId: string;
  displayName: string;
  professionalDesignation: string;
  hospitalName: string;
  role: string;
  medicationsSubmitted: number;
  requestsApproved: number;
  lastActivityAt: string | null;
}

export interface EnrichedAuditEvent extends AuditLogEntry {
  actorDisplayName: string;
  actorRole: string;
  professionalDesignation: string;
  hospitalName: string;
  actionLabel: string;
  href: string;
}

export function defaultAnalyticsFilters(): AnalyticsFilters {
  return {
    hospitalId: '',
    datePreset: '30d',
    actorId: '',
    designation: 'all',
    activityType: 'all',
    contentType: 'all',
  };
}

export function parseAnalyticsFilters(params: URLSearchParams): AnalyticsFilters {
  const preset = params.get('range') as AnalyticsDatePreset | null;
  const designation = params.get('designation') as ProfessionalDesignation | 'all' | null;
  const activityType = params.get('activity') as AnalyticsActivityType | null;
  const contentType = params.get('type') as AnalyticsContentType | null;
  return {
    hospitalId: params.get('hospital') ?? '',
    datePreset: preset && ['7d', '30d', '90d', 'year', 'custom', 'all'].includes(preset) ? preset : '30d',
    customFrom: params.get('from') ?? undefined,
    customTo: params.get('to') ?? undefined,
    actorId: params.get('actor') ?? '',
    designation: designation && designation !== 'all' ? designation : 'all',
    activityType: activityType && activityType !== 'all' ? activityType : 'all',
    contentType: contentType && contentType !== 'all' ? contentType : 'all',
  };
}

export function analyticsFiltersToSearchParams(filters: AnalyticsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.hospitalId) params.set('hospital', filters.hospitalId);
  if (filters.datePreset !== '30d') params.set('range', filters.datePreset);
  if (filters.customFrom) params.set('from', filters.customFrom);
  if (filters.customTo) params.set('to', filters.customTo);
  if (filters.actorId) params.set('actor', filters.actorId);
  if (filters.designation !== 'all') params.set('designation', filters.designation);
  if (filters.activityType !== 'all') params.set('activity', filters.activityType);
  if (filters.contentType !== 'all') params.set('type', filters.contentType);
  return params;
}

function startOfDay(isoDate: string): Date {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00`);
}

function endOfDay(isoDate: string): Date {
  return new Date(`${isoDate.slice(0, 10)}T23:59:59.999`);
}

export function resolveDateRange(filters: AnalyticsFilters, now = new Date()): { from: Date | null; to: Date } {
  const to = filters.customTo ? endOfDay(filters.customTo) : now;
  if (filters.datePreset === 'all') return { from: null, to };
  if (filters.datePreset === 'custom') {
    return {
      from: filters.customFrom ? startOfDay(filters.customFrom) : null,
      to: filters.customTo ? endOfDay(filters.customTo) : now,
    };
  }
  const from = new Date(to);
  if (filters.datePreset === '7d') from.setDate(from.getDate() - 7);
  else if (filters.datePreset === '30d') from.setDate(from.getDate() - 30);
  else if (filters.datePreset === '90d') from.setDate(from.getDate() - 90);
  else if (filters.datePreset === 'year') from.setMonth(0, 1);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function inRange(timestamp: string, from: Date | null, to: Date): boolean {
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return false;
  if (from && time < from.getTime()) return false;
  return time <= to.getTime();
}

function findAccount(
  accounts: TeamAccount[],
  entry: Pick<AuditLogEntry, 'actorId' | 'actorLabel'>,
): TeamAccount | undefined {
  if (entry.actorId) return accounts.find((account) => account.id === entry.actorId);
  const label = entry.actorLabel?.trim().toLowerCase();
  if (!label || label === 'system') return undefined;
  return accounts.find(
    (account) =>
      account.displayName.trim().toLowerCase() === label || account.username.trim().toLowerCase() === label,
  );
}

function hospitalName(hospitals: Hospital[], hospitalId?: string): string {
  if (!hospitalId) return 'Data unavailable';
  return hospitals.find((hospital) => hospital.id === hospitalId)?.nameEn ?? 'Data unavailable';
}

export function auditActionLabel(action: AuditLogEntry['action']): string {
  const map: Record<AuditLogEntry['action'], string> = {
    created: 'Created',
    updated: 'Updated',
    archived: 'Archived',
    restored: 'Restored',
    deleted: 'Deleted',
    published: 'Prepared for Deployment / Published',
    reset: 'Workspace Reset',
    submitted: 'Submitted for Review',
    approved: 'Approved',
    rejected: 'Rejected',
    'changes-requested': 'Changes Requested',
  };
  return map[action] ?? action;
}

export function contentHref(targetType: ContentKind, targetId: string): string {
  if (targetType === 'drug') return `/admin/drugs/${targetId}`;
  if (targetType === 'protocol') return `/admin/protocols/${targetId}`;
  if (targetType === 'guideline') return `/admin/guidelines/${targetId}`;
  if (targetType === 'education') return `/admin/education/${targetId}`;
  if (targetType === 'chemotherapy') return `/admin/chemotherapy/${targetId}`;
  if (targetType === 'therapeutic-class') return `/admin/therapeutic-classes/${targetId}`;
  if (targetType === 'hospital') return `/admin/hospitals`;
  return '/admin/activity';
}

function contentTypeLabel(type: ContentKind | string): string {
  const map: Record<string, string> = {
    drug: 'Drugs',
    protocol: 'Protocols',
    guideline: 'Guidelines',
    chemotherapy: 'Chemotherapy Protocols',
    education: 'Patient Counseling Materials',
    'therapeutic-class': 'Therapeutic Classes',
    hospital: 'Hospitals',
    section: 'Sections',
    media: 'Media',
    settings: 'Settings',
  };
  return map[type] ?? type;
}

function matchesFilters(
  entry: AuditLogEntry,
  filters: AnalyticsFilters,
  accounts: TeamAccount[],
  from: Date | null,
  to: Date,
): boolean {
  if (!inRange(entry.timestamp, from, to)) return false;
  if (filters.activityType !== 'all' && entry.action !== filters.activityType) return false;
  if (filters.contentType !== 'all' && entry.targetType !== filters.contentType) return false;

  const account = findAccount(accounts, entry);
  if (filters.actorId) {
    if (account?.id !== filters.actorId && entry.actorId !== filters.actorId) return false;
  }
  if (filters.designation !== 'all') {
    if ((account?.professionalDesignation ?? 'unspecified') !== filters.designation) return false;
  }
  if (filters.hospitalId) {
    if (account?.hospitalId !== filters.hospitalId) return false;
  }
  return true;
}

export function enrichAuditEvents(
  state: ContentState,
  accounts: TeamAccount[],
  filters: AnalyticsFilters,
): EnrichedAuditEvent[] {
  const { from, to } = resolveDateRange(filters);
  const hospitals = state.hospitals ?? [];
  return state.audit
    .filter((entry) => matchesFilters(entry, filters, accounts, from, to))
    .map((entry) => {
      const account = findAccount(accounts, entry);
      return {
        ...entry,
        actorDisplayName: account?.displayName || entry.actorLabel || 'Unknown contributor',
        actorRole: account ? account.role : 'Data unavailable',
        professionalDesignation: account
          ? PROFESSIONAL_DESIGNATION_LABEL[account.professionalDesignation ?? 'unspecified']
          : 'Data unavailable',
        hospitalName: hospitalName(hospitals, account?.hospitalId),
        actionLabel: auditActionLabel(entry.action),
        href: contentHref(entry.targetType, entry.targetId),
      };
    });
}

export function computeAnalyticsKpis(
  state: ContentState,
  accounts: TeamAccount[],
  filters: AnalyticsFilters,
  liveCatalog: ContentState = publishedCatalog,
): AnalyticsKpis {
  const { from, to } = resolveDateRange(filters);
  const events = state.audit.filter((entry) => matchesFilters(entry, filters, accounts, from, to));

  const pendingReviews = [
    ...state.drugs,
    ...state.protocols,
    ...state.guidelines,
    ...state.education,
    ...state.chemotherapy,
  ].filter((item) => item.status === 'pending-review').length;

  let approvedMedications = state.drugs.filter((drug) => isReadyForDeployment(drug.status)).length;
  if (filters.hospitalId) {
    approvedMedications = state.drugs.filter(
      (drug) =>
        isReadyForDeployment(drug.status) &&
        (drug.hospitalAssignments ?? []).some((row) => row.hospitalId === filters.hospitalId && row.enabled),
    ).length;
  }

  let publishedMedications = liveCatalog.drugs.filter((drug) => drug.status === 'published').length;
  if (filters.hospitalId) {
    publishedMedications = liveCatalog.drugs.filter(
      (drug) =>
        drug.status === 'published' &&
        (drug.hospitalAssignments ?? []).some((row) => row.hospitalId === filters.hospitalId && row.enabled),
    ).length;
  }

  const medicationSubmissions = events.filter(
    (entry) => entry.targetType === 'drug' && (entry.action === 'submitted' || entry.action === 'created'),
  ).length;

  const pharmacyAccounts = accounts.filter((account) => isPharmacyProfessional(account.professionalDesignation));
  const registeredPharmacyProfessionals =
    accounts.length === 0 ? null : pharmacyAccounts.filter((account) => account.active).length;

  const contributorKeys = new Set<string>();
  for (const entry of events) {
    const account = findAccount(accounts, entry);
    if (account) contributorKeys.add(account.id);
    else if (entry.actorId) contributorKeys.add(entry.actorId);
    else if (entry.actorLabel && entry.actorLabel !== 'System') contributorKeys.add(`label:${entry.actorLabel}`);
  }

  const latestSubmission = [...events]
    .filter((entry) => entry.targetType === 'drug' && (entry.action === 'submitted' || entry.action === 'created'))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  let latestMedicationContributor: LatestContributor | null = null;
  if (latestSubmission) {
    const account = findAccount(accounts, latestSubmission);
    latestMedicationContributor = {
      displayName: account?.displayName || latestSubmission.actorLabel || 'Unknown contributor',
      professionalDesignation: account
        ? PROFESSIONAL_DESIGNATION_LABEL[account.professionalDesignation ?? 'unspecified']
        : 'Data unavailable',
      hospitalName: hospitalName(state.hospitals, account?.hospitalId),
      medicationTitle: latestSubmission.targetLabel,
      timestamp: latestSubmission.timestamp,
      drugId: latestSubmission.targetId,
      actorId: account?.id ?? latestSubmission.actorId,
      href: contentHref('drug', latestSubmission.targetId),
    };
  }

  return {
    pendingReviews,
    approvedMedications,
    publishedMedications,
    medicationSubmissions,
    registeredPharmacyProfessionals,
    activeContributors: contributorKeys.size,
    latestMedicationContributor,
  };
}

export function hospitalContributionChart(
  state: ContentState,
  accounts: TeamAccount[],
  filters: AnalyticsFilters,
): HospitalContributionRow[] {
  const { from, to } = resolveDateRange(filters);
  const hospitals = sortedHospitals(state.hospitals ?? []);
  return hospitals.map((hospital) => {
    const uniqueAssignedMedications = state.drugs.filter((drug) =>
      (drug.hospitalAssignments ?? []).some((row) => row.hospitalId === hospital.id && row.enabled),
    ).length;

    const submissionEvents = state.audit.filter((entry) => {
      if (!inRange(entry.timestamp, from, to)) return false;
      if (entry.targetType !== 'drug') return false;
      if (entry.action !== 'submitted' && entry.action !== 'created') return false;
      const account = findAccount(accounts, entry);
      if (filters.actorId && account?.id !== filters.actorId && entry.actorId !== filters.actorId) return false;
      if (filters.designation !== 'all' && (account?.professionalDesignation ?? 'unspecified') !== filters.designation) {
        return false;
      }
      // Prefer contributor hospital affiliation; if missing, count against assigned hospitals of the drug.
      if (account?.hospitalId) return account.hospitalId === hospital.id;
      const drug = state.drugs.find((item) => item.id === entry.targetId);
      return (drug?.hospitalAssignments ?? []).some((row) => row.hospitalId === hospital.id && row.enabled);
    }).length;

    return {
      hospitalId: hospital.id,
      nameEn: hospital.nameEn,
      uniqueAssignedMedications,
      submissionEvents,
    };
  });
}

export function reviewStatusChart(state: ContentState): StatusSlice[] {
  const items = [
    ...state.drugs,
    ...state.protocols,
    ...state.guidelines,
    ...state.education,
    ...state.chemotherapy,
  ];
  const counts: Record<string, number> = {
    'pending-review': 0,
    'changes-requested': 0,
    approved: 0,
    published: 0,
    rejected: 0,
  };
  for (const item of items) {
    if (item.status === 'pending-review') counts['pending-review'] += 1;
    else if (item.status === 'changes-requested') counts['changes-requested'] += 1;
    else if (item.status === 'approved') counts.approved += 1;
    else if (item.status === 'published') counts.published += 1;
    else if (item.status === 'rejected') counts.rejected += 1;
  }
  return [
    { status: 'pending-review', label: 'Pending Review', count: counts['pending-review'] },
    { status: 'changes-requested', label: 'Changes Requested', count: counts['changes-requested'] },
    { status: 'approved', label: 'Approved', count: counts.approved },
    { status: 'published', label: 'Published / Ready', count: counts.published },
    { status: 'rejected', label: 'Rejected', count: counts.rejected },
  ];
}

export function monthlyContentActivity(
  state: ContentState,
  monthsBack: 6 | 12,
  now = new Date(),
): MonthlyActivityRow[] {
  const rows: MonthlyActivityRow[] = [];
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    rows.push({ month: key, created: 0, submitted: 0, approved: 0, published: 0 });
  }
  const index = new Map(rows.map((row) => [row.month, row]));
  for (const entry of state.audit) {
    const key = entry.timestamp.slice(0, 7);
    const row = index.get(key);
    if (!row) continue;
    if (entry.action === 'created') row.created += 1;
    if (entry.action === 'submitted') row.submitted += 1;
    if (entry.action === 'approved') row.approved += 1;
    if (entry.action === 'published') row.published += 1;
  }
  return rows;
}

export function teamContributionChart(
  state: ContentState,
  accounts: TeamAccount[],
  filters: AnalyticsFilters,
): ContributorRankRow[] {
  const { from, to } = resolveDateRange(filters);
  const map = new Map<string, ContributorRankRow>();

  for (const entry of state.audit) {
    if (!inRange(entry.timestamp, from, to)) continue;
    if (entry.targetType !== 'drug') continue;
    if (entry.action !== 'submitted' && entry.action !== 'created') continue;
    const account = findAccount(accounts, entry);
    if (filters.hospitalId && account?.hospitalId !== filters.hospitalId) continue;
    if (filters.designation !== 'all' && (account?.professionalDesignation ?? 'unspecified') !== filters.designation) {
      continue;
    }
    const key = account?.id ?? entry.actorId ?? `label:${entry.actorLabel || 'unknown'}`;
    const existing = map.get(key);
    if (existing) {
      existing.submissions += 1;
      continue;
    }
    map.set(key, {
      actorKey: key,
      displayName: account?.displayName || entry.actorLabel || 'Unknown contributor',
      professionalDesignation: account
        ? PROFESSIONAL_DESIGNATION_LABEL[account.professionalDesignation ?? 'unspecified']
        : 'Data unavailable',
      hospitalName: hospitalName(state.hospitals, account?.hospitalId),
      submissions: 1,
      actorId: account?.id ?? entry.actorId,
    });
  }

  return [...map.values()].sort((a, b) => b.submissions - a.submissions);
}

export function contentTypeChart(
  state: ContentState,
  accounts: TeamAccount[],
  filters: AnalyticsFilters,
): ContentTypeSlice[] {
  const { from, to } = resolveDateRange(filters);
  const counts: Record<string, number> = {
    drug: 0,
    protocol: 0,
    guideline: 0,
    chemotherapy: 0,
    education: 0,
  };
  for (const entry of state.audit) {
    if (!matchesFilters(entry, { ...filters, contentType: 'all' }, accounts, from, to)) continue;
    if (entry.targetType in counts) counts[entry.targetType] += 1;
  }
  return (Object.keys(counts) as Array<keyof typeof counts>).map((type) => ({
    type,
    label: contentTypeLabel(type),
    count: counts[type],
  }));
}

export function pharmacyTeamOverview(
  state: ContentState,
  accounts: TeamAccount[],
  filters: AnalyticsFilters,
): TeamOverviewRow[] {
  const { from, to } = resolveDateRange(filters);
  return accounts
    .filter((account) => {
      if (filters.hospitalId && account.hospitalId !== filters.hospitalId) return false;
      if (filters.designation !== 'all' && (account.professionalDesignation ?? 'unspecified') !== filters.designation) {
        return false;
      }
      if (filters.actorId && account.id !== filters.actorId) return false;
      return true;
    })
    .map((account) => {
      const medicationsSubmitted = state.drugs.filter((drug) => drug.authorId === account.id).length;
      const requestsApproved = state.audit.filter(
        (entry) =>
          entry.action === 'approved' &&
          (entry.actorId === account.id || findAccount(accounts, entry)?.id === account.id) &&
          inRange(entry.timestamp, from, to),
      ).length;
      const last = state.audit
        .filter((entry) => entry.actorId === account.id || findAccount(accounts, entry)?.id === account.id)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      return {
        accountId: account.id,
        displayName: account.displayName,
        professionalDesignation: PROFESSIONAL_DESIGNATION_LABEL[account.professionalDesignation ?? 'unspecified'],
        hospitalName: hospitalName(state.hospitals, account.hospitalId),
        role: account.role,
        medicationsSubmitted,
        requestsApproved,
        lastActivityAt: last?.timestamp ?? null,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function statusFilterHref(status: PublicationStatus | string): string {
  if (status === 'pending-review') return '/admin/review-requests?status=pending';
  if (status === 'changes-requested' || status === 'rejected') return '/admin/review-requests?status=changes';
  if (status === 'approved' || status === 'published') return '/admin/review-requests?status=published';
  return '/admin/review-requests';
}
