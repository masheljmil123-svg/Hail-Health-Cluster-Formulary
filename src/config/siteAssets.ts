import { publicUrl } from '@/lib/publicUrl';

/**
 * Central image paths for King Salman Specialist Hospital — Hail Health Cluster Formulary.
 * Replace the files in /public/assets without changing page layouts.
 * The logo is the official horizontal Hail Health Cluster mark from
 * https://hailthy.net/identity/ (“شعار تجمع حائل - عرضي”).
 * Paths use Vite BASE_URL so GitHub Pages project sites resolve correctly.
 */
export const siteAssets = {
  hospitalExteriorPrimary: publicUrl('assets/hospital-exterior-primary.jpg'),
  hospitalExteriorAlternative: publicUrl('assets/hospital-exterior-alternative.jpg'),
  hailHealthClusterLogo: publicUrl('assets/hail-health-cluster-logo.png'),
  /** Source medication still-life used by `npm run compose-heroes` (not shown alone in the hero). */
  heroPharmacy: publicUrl('assets/hero-pharmacy.jpg'),
} as const;

export type BuiltinAssetKey = keyof typeof siteAssets;

export const builtinAssetMeta: Record<
  BuiltinAssetKey,
  { title: string; alt: string; src: string }
> = {
  hospitalExteriorPrimary: {
    title: 'Hospital exterior — primary',
    alt: 'King Salman Specialist Hospital exterior, primary photograph',
    src: siteAssets.hospitalExteriorPrimary,
  },
  hospitalExteriorAlternative: {
    title: 'Hospital exterior — alternative',
    alt: 'King Salman Specialist Hospital exterior, alternative photograph',
    src: siteAssets.hospitalExteriorAlternative,
  },
  hailHealthClusterLogo: {
    title: 'Hail Health Cluster logo',
    alt: 'Hail Health Cluster',
    src: siteAssets.hailHealthClusterLogo,
  },
  heroPharmacy: {
    title: 'Homepage hero — pharmacy still-life',
    alt: 'Medication packaging for the formulary homepage hero',
    src: siteAssets.heroPharmacy,
  },
};
