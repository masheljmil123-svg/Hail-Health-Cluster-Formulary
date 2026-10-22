/**
 * Central image paths for King Salman Specialist Hospital Formulary Library.
 * Replace the files in /public/assets without changing page layouts.
 * The logo is the official horizontal Hail Health Cluster mark from
 * https://hailthy.net/identity/ (“شعار تجمع حائل - عرضي”).
 */
export const siteAssets = {
  hospitalExteriorPrimary: '/assets/hospital-exterior-primary.jpg',
  hospitalExteriorAlternative: '/assets/hospital-exterior-alternative.jpg',
  hailHealthClusterLogo: '/assets/hail-health-cluster-logo.png',
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
};
