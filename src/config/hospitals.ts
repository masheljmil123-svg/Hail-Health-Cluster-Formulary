import { siteAssets } from '@/config/siteAssets';
import { publicUrl } from '@/lib/publicUrl';
import type { Hospital } from '@/types';

/**
 * Default Hail Health Cluster hospitals.
 * Display names are editable in Admin → Hospital Management / published catalog.
 */
export const DEFAULT_HOSPITALS: Hospital[] = [
  {
    id: 'hospital-king-salman',
    slug: 'king-salman',
    nameEn: 'King Salman Specialist Hospital',
    nameAr: 'مستشفى الملك سلمان التخصصي',
    imagePath: siteAssets.hospitalExteriorPrimary,
    description: 'Specialist hospital formulary within Hail Health Cluster.',
    displayOrder: 1,
    enabled: true,
    iconKey: 'building',
  },
  {
    id: 'hospital-maternity-children',
    slug: 'maternity-children',
    nameEn: "Maternity & Children's Hospital — Hail",
    nameAr: 'مستشفى النساء والولادة والأطفال بحائل',
    imagePath: publicUrl('assets/hospitals/maternity-children.jpg'),
    description: 'Maternity and children’s hospital formulary within Hail Health Cluster.',
    displayOrder: 2,
    enabled: true,
    iconKey: 'baby',
  },
  {
    id: 'hospital-hail-general',
    slug: 'hail-general',
    nameEn: 'Hail General Hospital',
    nameAr: 'مستشفى حائل العام',
    imagePath: publicUrl('assets/hospitals/hail-general.jpg'),
    description: 'General hospital formulary within Hail Health Cluster.',
    displayOrder: 3,
    enabled: true,
    iconKey: 'heart-pulse',
  },
  {
    id: 'hospital-king-khalid',
    slug: 'king-khalid',
    nameEn: 'King Khalid Hospital — Hail',
    nameAr: 'مستشفى الملك خالد بحائل',
    imagePath: publicUrl('assets/hospitals/king-khalid.jpg'),
    description: 'King Khalid Hospital formulary within Hail Health Cluster.',
    displayOrder: 4,
    enabled: true,
    iconKey: 'hospital',
  },
  {
    id: 'hospital-eradah',
    slug: 'eradah',
    nameEn: 'Eradah & Mental Health Complex — Hail',
    nameAr: 'مجمع إرادة والصحة النفسية بحائل',
    imagePath: publicUrl('assets/hospitals/eradah-mental-health.jpg'),
    description: 'Mental health complex formulary within Hail Health Cluster.',
    displayOrder: 5,
    enabled: true,
    iconKey: 'brain',
  },
];

export function cloneDefaultHospitals(): Hospital[] {
  return DEFAULT_HOSPITALS.map((hospital) => ({ ...hospital }));
}
