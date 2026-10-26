/**
 * Prefix a root-relative public asset path with Vite's base URL.
 * Required for GitHub Pages project sites (e.g. /KSSH-Formulary-Library/).
 */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const cleaned = path.replace(/^\//, '');
  return `${base}${cleaned}`;
}

/** React Router basename without a trailing slash. */
export function routerBasename(): string | undefined {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return base || undefined;
}
