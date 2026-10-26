import { cloneDefaultHospitals } from '@/config/hospitals';
import { publicUrl } from '@/lib/publicUrl';
import type { ContentState, Drug, Hospital, HospitalDrugAssignment, LibraryDocument } from '@/types';

export function hospitalBasePath(slug: string): string {
  return `/hospital/${slug}`;
}

/** Prefix a site-relative path with the selected hospital base. */
export function hospitalPath(slug: string, path = ''): string {
  const base = hospitalBasePath(slug);
  if (!path || path === '/') return base;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized.startsWith('/hospital/')) return normalized;
  return `${base}${normalized}`;
}

export function findHospitalBySlug(hospitals: Hospital[], slug: string | undefined): Hospital | undefined {
  if (!slug) return undefined;
  return hospitals.find((hospital) => hospital.slug === slug && hospital.enabled);
}

export function findHospitalById(hospitals: Hospital[], id: string): Hospital | undefined {
  return hospitals.find((hospital) => hospital.id === id);
}

export function sortedEnabledHospitals(hospitals: Hospital[]): Hospital[] {
  return [...hospitals]
    .filter((hospital) => hospital.enabled)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.nameEn.localeCompare(b.nameEn));
}

export function sortedHospitals(hospitals: Hospital[]): Hospital[] {
  return [...hospitals].sort((a, b) => a.displayOrder - b.displayOrder || a.nameEn.localeCompare(b.nameEn));
}

/** Ensure every configured hospital has an assignment row; missing rows default to OFF. */
export function ensureHospitalAssignments(drug: Drug, hospitals: Hospital[]): HospitalDrugAssignment[] {
  const existing = new Map((drug.hospitalAssignments ?? []).map((row) => [row.hospitalId, row]));
  return hospitals.map((hospital) => {
    const prior = existing.get(hospital.id);
    return {
      hospitalId: hospital.id,
      enabled: prior?.enabled === true,
      notes: prior?.notes,
      hospitalSpecificFormulationIds: prior?.hospitalSpecificFormulationIds,
    };
  });
}

export function isDrugEnabledForHospital(drug: Drug, hospitalId: string): boolean {
  return (drug.hospitalAssignments ?? []).some((row) => row.hospitalId === hospitalId && row.enabled);
}

/**
 * Published drugs assigned ON for a hospital.
 * Does not invent availability — only explicit assignments + published (or legacy approved) status.
 */
export function drugsForHospital(drugs: Drug[], hospitalId: string): Drug[] {
  return drugs.filter(
    (drug) =>
      (drug.status === 'published' || drug.status === 'approved') && isDrugEnabledForHospital(drug, hospitalId),
  );
}

/**
 * Resources: if hospitalIds is omitted/empty, treat as cluster-wide (all hospitals).
 * If populated, only listed hospitals see the document.
 */
export function documentVisibleForHospital(doc: LibraryDocument & { hospitalIds?: string[] }, hospitalId: string): boolean {
  const ids = doc.hospitalIds;
  if (!ids || ids.length === 0) return true;
  return ids.includes(hospitalId);
}

export function migrateHospitals(state: ContentState): ContentState {
  const defaults = cloneDefaultHospitals();
  let hospitals: Hospital[];

  if (!Array.isArray(state.hospitals) || state.hospitals.length === 0) {
    hospitals = defaults;
  } else {
    hospitals = state.hospitals.map((hospital) => ({
      ...hospital,
      nameEn: hospital.nameEn || hospital.slug,
      nameAr: hospital.nameAr || '',
      imagePath: hospital.imagePath || '',
      description: hospital.description || '',
      displayOrder: typeof hospital.displayOrder === 'number' ? hospital.displayOrder : 0,
      enabled: hospital.enabled !== false,
    }));

    // Merge any missing default hospitals by stable id/slug (no duplicates).
    for (const def of defaults) {
      const exists = hospitals.some((hospital) => hospital.id === def.id || hospital.slug === def.slug);
      if (!exists) hospitals.push({ ...def });
    }

    hospitals = hospitals.map((hospital) => {
      const def = defaults.find((item) => item.id === hospital.id || item.slug === hospital.slug);
      if (!def) return hospital;
      return {
        ...hospital,
        nameAr: hospital.nameAr || def.nameAr,
        description: hospital.description || def.description,
        displayOrder: typeof hospital.displayOrder === 'number' ? hospital.displayOrder : def.displayOrder,
        iconKey: hospital.iconKey || def.iconKey,
        imagePath: hospital.imagePath || def.imagePath,
      };
    });
  }

  // Dedicated local photographs for the five cluster hospitals (never reuse King Salman for others).
  hospitals = hospitals.map((hospital) => {
    const def = defaults.find((item) => item.id === hospital.id || item.slug === hospital.slug);
    if (hospital.slug === 'king-salman') {
      return { ...hospital, imagePath: def?.imagePath || hospital.imagePath };
    }
    if (hospital.slug === 'maternity-children') {
      return {
        ...hospital,
        imagePath: publicUrl('assets/hospitals/maternity-children.jpg'),
        displayOrder: hospital.displayOrder || def?.displayOrder || 2,
      };
    }
    if (hospital.slug === 'hail-general') {
      return {
        ...hospital,
        imagePath: publicUrl('assets/hospitals/hail-general.jpg'),
        displayOrder: hospital.displayOrder || 3,
      };
    }
    if (hospital.slug === 'king-khalid') {
      return {
        ...hospital,
        nameEn: hospital.nameEn?.trim() || 'King Khalid Hospital — Hail',
        nameAr: hospital.nameAr?.trim() || 'مستشفى الملك خالد بحائل',
        imagePath: publicUrl('assets/hospitals/king-khalid.jpg'),
        displayOrder: hospital.displayOrder || 4,
        iconKey: hospital.iconKey || 'hospital',
        enabled: hospital.enabled !== false,
      };
    }
    if (hospital.slug === 'eradah') {
      const hasKingKhalid = hospitals.some((item) => item.slug === 'king-khalid');
      return {
        ...hospital,
        imagePath: publicUrl('assets/hospitals/eradah-mental-health.jpg'),
        displayOrder:
          hasKingKhalid && (hospital.displayOrder === 4 || !hospital.displayOrder)
            ? 5
            : hospital.displayOrder || 5,
      };
    }
    return hospital;
  });

  const drugs = (state.drugs ?? []).map((drug) => ({
    ...drug,
    // New hospital rows (including King Khalid) default to OFF.
    hospitalAssignments: ensureHospitalAssignments(drug, hospitals),
  }));

  return { ...state, hospitals, drugs };
}

export function createEmptyHospital(partial?: Partial<Hospital>): Hospital {
  const order = partial?.displayOrder ?? 99;
  return {
    id: partial?.id ?? `hospital-${Date.now()}`,
    slug: partial?.slug ?? `hospital-${order}`,
    nameEn: partial?.nameEn ?? 'New hospital',
    nameAr: partial?.nameAr ?? '',
    imagePath: partial?.imagePath ?? '',
    description: partial?.description ?? '',
    displayOrder: order,
    enabled: partial?.enabled ?? true,
    iconKey: partial?.iconKey ?? 'building',
  };
}
