import { isLocalAdminEnabled } from '@/config/runtime';
import { publishedCatalog } from '@/data/published/catalog';
import { useContent } from '@/hooks/useContent';
import type { ContentState } from '@/types';

/** Read-only repository catalog shown to all public visitors. */
export function usePublished(): ContentState {
  return publishedCatalog;
}

/**
 * Portal catalog for hospital selection and hospital formulary views.
 * Production GitHub Pages: published repository catalog only.
 * Local admin workspace (dev): workspace state so editors can verify before export.
 */
export function usePortalCatalog(): ContentState {
  const published = usePublished();
  const workspace = useContent();
  if (isLocalAdminEnabled()) return workspace.state;
  return published;
}
