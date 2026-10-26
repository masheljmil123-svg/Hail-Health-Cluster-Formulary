import { publishedCatalog } from '@/data/published/catalog';
import type { ContentState, Drug, Hospital, LibraryDocument, PublicationStatus } from '@/types';
import { countPublishedSections, hasMeaningfulWorkingContent } from '@/services/sectionPublication';
import { collectionFor } from '@/services/library';

/** Editorial workflow status shown to administrators (not “live on website”). */
export type EditorialStatus = PublicationStatus;

export type DeploymentStatus = 'not-exported' | 'ready-for-deployment' | 'live-on-website';

export const DEPLOYMENT_STATUS_LABEL: Record<DeploymentStatus, string> = {
  'not-exported': 'Not Exported',
  'ready-for-deployment': 'Ready for Deployment',
  'live-on-website': 'Live on Website',
};

export const EDITORIAL_STATUS_LABEL: Record<EditorialStatus, string> = {
  draft: 'Draft',
  'pending-review': 'Pending Review',
  'changes-requested': 'Changes Requested',
  rejected: 'Rejected',
  approved: 'Approved',
  published: 'Approved (legacy published label)',
  archived: 'Archived',
};

/** Editorial label for day-to-day medication workflow. */
export function editorialLabel(status: PublicationStatus): string {
  if (status === 'approved' || status === 'published') return 'Published';
  if (status === 'rejected') return 'Changes Requested';
  return EDITORIAL_STATUS_LABEL[status] ?? status;
}

export function isReadyForDeployment(status: PublicationStatus): boolean {
  return status === 'approved' || status === 'published';
}

export function isLiveOnWebsite(drugId: string, liveCatalog: ContentState = publishedCatalog): boolean {
  return liveCatalog.drugs.some((drug) => drug.id === drugId && drug.status === 'published');
}

export function getDeploymentStatus(
  drug: Pick<Drug, 'id' | 'status'>,
  liveCatalog: ContentState = publishedCatalog,
): DeploymentStatus {
  if (isLiveOnWebsite(drug.id, liveCatalog)) return 'live-on-website';
  if (isReadyForDeployment(drug.status)) return 'ready-for-deployment';
  return 'not-exported';
}

export function hospitalInclusionLabel(enabled: boolean): string {
  return enabled ? 'Included in Hospital Formulary' : 'Not Included';
}

export interface DrugVisibilitySummary {
  editorialStatus: PublicationStatus;
  editorialLabel: string;
  deploymentStatus: DeploymentStatus;
  deploymentLabel: string;
  hospitals: Array<{ id: string; nameEn: string; enabled: boolean; label: string }>;
  publishedSectionCount: number;
  draftSectionCount: number;
  emptySectionCount: number;
  enabledHospitalCount: number;
  whyHidden: string[];
}

export function summarizeDrugVisibility(
  drug: Drug,
  hospitals: Hospital[],
  liveCatalog: ContentState = publishedCatalog,
  relatedDocs: LibraryDocument[] = [],
): DrugVisibilitySummary {
  const deploymentStatus = getDeploymentStatus(drug, liveCatalog);
  const hospitalRows = hospitals
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((hospital) => {
      const enabled = (drug.hospitalAssignments ?? []).some(
        (row) => row.hospitalId === hospital.id && row.enabled,
      );
      return {
        id: hospital.id,
        nameEn: hospital.nameEn,
        enabled,
        label: hospitalInclusionLabel(enabled),
      };
    });

  const publishedSectionCount = countPublishedSections(drug, relatedDocs);
  let draftSectionCount = 0;
  let emptySectionCount = 0;
  for (const section of drug.monographSections ?? []) {
    if (section.status === 'published') continue;
    if (hasMeaningfulWorkingContent(section, drug, relatedDocs)) draftSectionCount += 1;
    else emptySectionCount += 1;
  }

  const whyHidden: string[] = [];
  if (!isReadyForDeployment(drug.status)) {
    whyHidden.push('Not approved / prepared for deployment yet.');
  } else if (deploymentStatus !== 'live-on-website') {
    whyHidden.push('Approved locally but not yet exported into the repository and deployed to GitHub Pages.');
  }
  if (hospitalRows.every((row) => !row.enabled)) {
    whyHidden.push('No hospitals are set to Included — Drug Index will hide this medication everywhere.');
  }

  return {
    editorialStatus: drug.status,
    editorialLabel: editorialLabel(drug.status),
    deploymentStatus,
    deploymentLabel: DEPLOYMENT_STATUS_LABEL[deploymentStatus],
    hospitals: hospitalRows,
    publishedSectionCount,
    draftSectionCount,
    emptySectionCount,
    enabledHospitalCount: hospitalRows.filter((row) => row.enabled).length,
    whyHidden,
  };
}

export function countWorkspaceQueue(state: ContentState) {
  const items = [
    ...state.drugs,
    ...state.protocols,
    ...state.guidelines,
    ...state.education,
    ...state.chemotherapy,
  ];
  return {
    pendingReviews: items.filter((item) => item.status === 'pending-review').length,
    changesRequested: items.filter((item) => item.status === 'changes-requested').length,
    readyForDeployment: items.filter((item) => isReadyForDeployment(item.status)).length,
    livePublishedDrugs: state.drugs.filter((drug) => isLiveOnWebsite(drug.id)).length,
    drafts: items.filter((item) => item.status === 'draft').length,
    rejected: items.filter((item) => item.status === 'rejected' || item.status === 'archived').length,
  };
}

export function relatedDocsForDrug(state: ContentState, drug: Drug): LibraryDocument[] {
  const kinds = ['protocol', 'guideline', 'education', 'chemotherapy'] as const;
  const related: LibraryDocument[] = [];
  for (const kind of kinds) {
    for (const doc of collectionFor(state, kind)) {
      if (drug.relatedResourceIds?.includes(doc.id) || doc.relatedDrugIds?.includes(drug.id)) {
        related.push(doc);
      }
    }
  }
  return related;
}
