import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { usePortalCatalog } from '@/hooks/usePublished';
import { findHospitalBySlug, hospitalPath } from '@/services/hospitals';
import type { ContentState, Hospital } from '@/types';

interface HospitalContextValue {
  hospital: Hospital;
  slug: string;
  catalog: ContentState;
  /** Build a path under the selected hospital, e.g. path('/search') → /hospital/king-salman/search */
  path: (relative?: string) => string;
}

const HospitalContext = createContext<HospitalContextValue | null>(null);

export function HospitalProvider({ children }: { children: ReactNode }) {
  const { hospitalSlug } = useParams();
  const catalog = usePortalCatalog();
  const hospital = findHospitalBySlug(catalog.hospitals, hospitalSlug);

  const value = useMemo<HospitalContextValue | null>(() => {
    if (!hospital || !hospitalSlug) return null;
    return {
      hospital,
      slug: hospital.slug,
      catalog,
      path: (relative = '') => hospitalPath(hospital.slug, relative),
    };
  }, [hospital, hospitalSlug, catalog]);

  if (!value) {
    return <Navigate to="/" replace />;
  }

  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>;
}

export function useHospital(): HospitalContextValue {
  const context = useContext(HospitalContext);
  if (!context) {
    throw new Error('useHospital must be used within a hospital route');
  }
  return context;
}

/** Optional access when a component may render outside hospital routes (e.g. shared cards). */
export function useOptionalHospital(): HospitalContextValue | null {
  return useContext(HospitalContext);
}
