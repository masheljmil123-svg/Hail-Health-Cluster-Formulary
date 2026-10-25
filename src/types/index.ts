export type RoleId = 'visitor' | 'administrator' | 'team_member' | 'reviewer';

export type Permission =
  | 'content:read'
  | 'content:create'
  | 'content:update'
  | 'content:archive'
  | 'content:restore'
  | 'content:delete'
  | 'content:review'
  | 'content:publish'
  | 'content:submit'
  | 'sections:manage'
  | 'media:manage'
  | 'users:view'
  | 'users:manage'
  | 'activity:view'
  | 'settings:manage';

/**
 * Content review & publication workflow.
 * Only `published` items are visible on the public website.
 * Approval and publication remain separate actions.
 */
export type PublicationStatus =
  | 'draft'
  | 'pending-review'
  | 'changes-requested'
  | 'rejected'
  | 'approved'
  | 'published'
  | 'archived';

export type ReviewAction = 'submit' | 'request-changes' | 'reject' | 'approve' | 'publish' | 'approve-publish' | 'resubmit';

export interface ReviewHistoryEntry {
  id: string;
  action: ReviewAction;
  actorId: string;
  actorLabel: string;
  note?: string;
  timestamp: string;
  fromStatus: PublicationStatus;
  toStatus: PublicationStatus;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  relatedType: ContentKind | 'review' | 'user';
  relatedId: string;
  href: string;
  createdAt: string;
  read: boolean;
}

export interface TeamAccount {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: Extract<RoleId, 'administrator' | 'team_member'>;
  active: boolean;
  createdAt: string;
  /** Local-only credential digest — never used when Supabase Auth is configured. */
  passwordDigest?: string;
}

export type FormularyStatus = 'preferred' | 'restricted' | 'non-formulary' | 'pending';

export type SafetyFlag = 'high-alert' | 'lasa' | 'hazardous';

/** Explicit medication alert level for the monograph header badge. Never infer Low from an unset High Alert. */
export type MedicationAlertClassification = 'high-alert' | 'low' | 'unspecified';

export type ContentKind =
  | 'drug'
  | 'protocol'
  | 'guideline'
  | 'education'
  | 'chemotherapy'
  | 'therapeutic-class'
  | 'section'
  | 'media'
  | 'settings';

export interface TherapeuticSubclass {
  id: string;
  name: string;
}

export interface TherapeuticClass {
  id: string;
  name: string;
  description: string;
  subclasses: TherapeuticSubclass[];
  order: number;
  status: PublicationStatus;
}

/** TipTap document JSON (ProseMirror schema). */
export type RichDoc = {
  type: 'doc';
  content?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type MonographSectionKey =
  | 'brand-name'
  | 'synonyms'
  | 'therapeutic-class'
  | 'alert-boxed-warning'
  | 'dosing'
  | 'dosage-adjustment'
  | 'prescribing-restrictions'
  | 'guidelines-protocols'
  | 'warnings-contraindications'
  | 'pregnancy-lactation'
  | 'monitoring-parameters'
  | 'adverse-drug-reactions'
  | 'medication-safety'
  | 'mechanism-of-action'
  | 'pharmacokinetics'
  | 'dosage-forms'
  | 'administration'
  | 'patient-counseling'
  | 'fee'
  | 'formulary-restrictions-rems'
  | 'custom';

export type SectionContentType = 'richtext' | 'structured' | 'links' | 'images';

/** Per-section workflow status. Public pages show only `published` sections with meaningful approved content. */
export type SectionPublicationStatus = 'empty' | 'draft' | 'pending-approval' | 'published';

/** Snapshot of last administrator-approved content shown on the public monograph. */
export interface MonographSectionPublishedSnapshot {
  richText?: RichDoc | null;
  structured?: Record<string, string | boolean | RichDoc | null | undefined>;
  publishedAt: string;
}

export interface MonographSection {
  id: string;
  key: MonographSectionKey | string;
  title: string;
  displayOrder: number;
  /**
   * When false, the section is force-hidden on the public site even if published.
   * Admin checklist always lists the section regardless.
   */
  isVisible: boolean;
  contentType: SectionContentType;
  /** Working copy edited in Admin (may differ from the approved public snapshot). */
  richText?: RichDoc | null;
  /** Structured fields (e.g. kidney/liver/obesity adjustment notes as TipTap JSON or plain text). */
  structured?: Record<string, string | boolean | RichDoc | null | undefined>;
  status: SectionPublicationStatus;
  /** Last approved public revision. Kept while drafts are edited until republished. */
  publishedContent?: MonographSectionPublishedSnapshot | null;
}

export interface DrugFormulation {
  id: string;
  dosageForm: string;
  route: string;
  strengthValue?: string;
  strengthUnit?: string;
  concentrationValue?: string;
  concentrationUnit?: string;
  notes?: string;
}

export interface DosingEntry {
  id: string;
  indication: string;
  population?: string;
  dose?: string;
  doseUnit?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  maximumDose?: string;
  notes?: string;
  references?: string;
}

export interface DrugImageRef {
  id: string;
  mediaId: string;
  caption?: string;
  altText: string;
  displayOrder: number;
  isPrimary?: boolean;
}

export interface Drug {
  id: string;
  genericName: string;
  brandNames: string[];
  synonyms: string[];
  pharmacologicalClass: string;
  therapeuticClass: string;
  therapeuticClassIds: string[];
  formulations: DrugFormulation[];
  dosingEntries: DosingEntry[];
  keywords: string[];
  indicationsSummary: string;
  safetyFlags: SafetyFlag[];
  hasBoxedWarning: boolean;
  /** Working-copy alert classification (admin). Public pages use publishedAlertClassification. */
  alertClassification: MedicationAlertClassification;
  /** Approved public alert classification shown next to Print. */
  publishedAlertClassification: MedicationAlertClassification;
  /** Internal institutional status — not shown as “Formulary (Preferred)” on public pages. */
  formularyStatus: FormularyStatus;
  images: DrugImageRef[];
  monographSections: MonographSection[];
  relatedResourceIds: string[];
  feeApplicable: boolean | null;
  lastUpdated: string;
  lastReviewedAt: string;
  version: string;
  status: PublicationStatus;
  /** Author / owner of the working draft. */
  authorId?: string;
  authorLabel?: string;
  /** Published revision kept public while a new draft is under review. */
  publishedSnapshot?: {
    genericName: string;
    brandNames: string[];
    indicationsSummary: string;
    monographSections: MonographSection[];
    alertClassification: MedicationAlertClassification;
    publishedAt: string;
    version: string;
  } | null;
  reviewHistory?: ReviewHistoryEntry[];
  reviewNote?: string;
  submittedAt?: string;
  /** IDs of legacy records merged into this drug (non-destructive migration). */
  mergedFromIds?: string[];
}

export interface ResourceLink {
  id: string;
  label: string;
  url: string;
}

export interface ResourceAttachment {
  id: string;
  name: string;
  /** IndexedDB media blob id when stored locally. */
  mediaId?: string;
  /** External URL or legacy data URL (migrated when possible). */
  url?: string;
  mimeType?: string;
}

export interface LibraryDocument {
  id: string;
  title: string;
  summary: string;
  category: string;
  /** Optional notes; not required for protocol/guideline/chemotherapy/counseling. */
  body: string;
  lastUpdated: string;
  lastReviewedAt?: string;
  version: string;
  status: PublicationStatus;
  language: string;
  references?: string;
  attachments: ResourceAttachment[];
  externalLinks: ResourceLink[];
  relatedDrugIds: string[];
  authorId?: string;
  authorLabel?: string;
  reviewHistory?: ReviewHistoryEntry[];
  reviewNote?: string;
  submittedAt?: string;
  /** Snapshot of last published revision while a draft revision is in review. */
  publishedSnapshot?: {
    title: string;
    summary: string;
    attachments: ResourceAttachment[];
    externalLinks: ResourceLink[];
    version: string;
    publishedAt: string;
  } | null;
  /** @deprecated Prefer attachments[]; kept for migration. */
  attachmentName?: string;
  /** @deprecated Prefer attachments + IndexedDB. */
  attachmentDataUrl?: string;
}

export type SectionKind = 'hero' | 'feature' | 'updates' | 'trending' | 'custom';
export type FeatureAccent = 'blue' | 'green' | 'amber' | 'peach' | 'lavender';
export type FeatureIcon = 'pill' | 'file' | 'book' | 'book-check' | 'ribbon' | 'users';

export interface HomepageSection {
  id: string;
  kind: SectionKind;
  title: string;
  description: string;
  visible: boolean;
  order: number;
  linkLabel: string;
  linkHref: string;
  accent?: FeatureAccent;
  icon?: FeatureIcon;
  searchPlaceholder?: string;
  popularSearches?: string[];
}

export interface MediaRecord {
  id: string;
  assetKey: 'hospitalExteriorPrimary' | 'hospitalExteriorAlternative' | 'hailHealthClusterLogo' | 'upload';
  title: string;
  alt: string;
  src?: string;
}

export interface AuditLogEntry {
  id: string;
  action:
    | 'created'
    | 'updated'
    | 'archived'
    | 'restored'
    | 'deleted'
    | 'published'
    | 'reset'
    | 'submitted'
    | 'approved'
    | 'rejected'
    | 'changes-requested';
  targetType: ContentKind;
  targetId: string;
  targetLabel: string;
  actorLabel: string;
  timestamp: string;
  note?: string;
}

export interface SearchCount {
  term: string;
  count: number;
}

export type AuthMode = 'local' | 'supabase';

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  email?: string;
  role: RoleId;
  mode: AuthMode;
}

export interface AuthProvider {
  id: AuthMode;
  label: string;
  getSession(): AuthSession | null;
  signIn(credentials: { username: string; password: string }): Promise<AuthSession | null>;
  signOut(): Promise<void>;
}

export interface ContentState {
  drugs: Drug[];
  protocols: LibraryDocument[];
  guidelines: LibraryDocument[];
  education: LibraryDocument[];
  chemotherapy: LibraryDocument[];
  therapeuticClasses: TherapeuticClass[];
  sections: HomepageSection[];
  media: MediaRecord[];
  audit: AuditLogEntry[];
  searchCounts: SearchCount[];
  savedSearches: string[];
}

export type DocumentKind = 'protocol' | 'guideline' | 'education' | 'chemotherapy';

export type SortKey = 'best' | 'updated' | 'name' | 'name-desc';

export interface SearchFilters {
  classes: string[];
  formulary: FormularyStatus[];
  routes: string[];
  forms: string[];
  updated: string[];
  sort: SortKey;
  safety: SafetyFlag[];
}
