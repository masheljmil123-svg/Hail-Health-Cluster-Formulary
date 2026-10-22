export type RoleId = 'visitor' | 'administrator' | 'reviewer';

export type Permission =
  | 'content:read'
  | 'content:create'
  | 'content:update'
  | 'content:archive'
  | 'content:restore'
  | 'content:delete'
  | 'content:review'
  | 'sections:manage'
  | 'media:manage'
  | 'users:view'
  | 'activity:view'
  | 'settings:manage';

export type PublicationStatus = 'draft' | 'published' | 'archived';

export type FormularyStatus = 'preferred' | 'restricted' | 'non-formulary' | 'pending';

export type ContentKind = 'drug' | 'protocol' | 'guideline' | 'education' | 'section' | 'media' | 'settings';

export interface Drug {
  id: string;
  genericName: string;
  brandName: string;
  pharmacologicalClass: string;
  therapeuticClass: string;
  formulations: string[];
  routes: string[];
  dosageForms: string[];
  keywords: string[];
  indicationsSummary: string;
  formularyStatus: FormularyStatus;
  lastUpdated: string;
  version: string;
  status: PublicationStatus;
  overview: string;
  dosing: string;
  restrictions: string;
  safety: string;
  monitoring: string;
  compatibility: string;
  references: string;
}

export interface LibraryDocument {
  id: string;
  title: string;
  summary: string;
  category: string;
  body: string;
  lastUpdated: string;
  version: string;
  status: PublicationStatus;
  language: string;
}

export type SectionKind = 'hero' | 'feature' | 'updates' | 'trending' | 'custom';
export type FeatureAccent = 'blue' | 'green' | 'amber' | 'lavender';
export type FeatureIcon = 'pill' | 'file' | 'book' | 'users';

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
  action: 'created' | 'updated' | 'archived' | 'restored' | 'deleted' | 'published' | 'reset';
  targetType: ContentKind;
  targetId: string;
  targetLabel: string;
  actorLabel: string;
  timestamp: string;
}

export interface SearchCount {
  term: string;
  count: number;
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  role: RoleId;
  mode: 'demo';
}

export interface AuthProvider {
  id: 'demo';
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
  sections: HomepageSection[];
  media: MediaRecord[];
  audit: AuditLogEntry[];
  searchCounts: SearchCount[];
  savedSearches: string[];
}

export type DocumentKind = 'protocol' | 'guideline' | 'education';

export type SortKey = 'best' | 'updated' | 'name' | 'name-desc';

export interface SearchFilters {
  classes: string[];
  formulary: FormularyStatus[];
  routes: string[];
  forms: string[];
  updated: string[];
  sort: SortKey;
}
