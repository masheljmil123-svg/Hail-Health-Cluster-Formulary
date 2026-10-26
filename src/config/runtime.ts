/**
 * Local admin workspace is available in Vite dev mode, or when explicitly
 * enabled for a local preview build. Production GitHub Pages builds leave
 * this false so visitors never see a client-side “secure” admin surface.
 */
export function isLocalAdminEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  return import.meta.env.VITE_ENABLE_LOCAL_ADMIN === 'true';
}
