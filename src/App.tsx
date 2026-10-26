import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AuthProvider } from '@/hooks/useAuth';
import { ContentProvider } from '@/hooks/useContent';
import { HospitalProvider } from '@/hooks/useHospital';
import { AboutPage, HelpPage, NotFoundPage, ResourcesPage, UpdatesPage } from '@/pages/InfoPages';
import { DrugDetailPage } from '@/pages/DrugDetailPage';
import { DrugIndexPage } from '@/pages/DrugIndexPage';
import { ChemotherapyProtocolDetailPage, ChemotherapyProtocolsPage } from '@/pages/ChemotherapyPages';
import { DocumentDetailPage, DocumentListPage, ProtocolsGuidelinesPage } from '@/pages/DocumentPages';
import { HomePage } from '@/pages/HomePage';
import { SearchPage } from '@/pages/SearchPage';
import { WelcomePage } from '@/pages/WelcomePage';
import { routerBasename } from '@/lib/publicUrl';

/**
 * Compile-time flag: false on GitHub Pages production builds so the local-admin
 * chunk (login, editors, Phase 3 drafts) is not referenced and is omitted from dist.
 */
const LOCAL_ADMIN =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOCAL_ADMIN === 'true';

const LocalAdminRouteTree = LOCAL_ADMIN
  ? lazy(() => import('@/routes/LocalAdminRouteTree'))
  : null;

export function App() {
  return (
    <AuthProvider>
      <ContentProvider>
        <BrowserRouter basename={routerBasename()}>
          <Routes>
            <Route path="/" element={<WelcomePage />} />

            <Route
              path="/hospital/:hospitalSlug"
              element={
                <HospitalProvider>
                  <PublicLayout />
                </HospitalProvider>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="drugs/:id" element={<DrugDetailPage />} />
              <Route path="drug-index" element={<DrugIndexPage />} />
              <Route path="protocols-guidelines" element={<ProtocolsGuidelinesPage />} />
              <Route path="protocols" element={<DocumentListPage kind="protocol" />} />
              <Route path="protocols/:id" element={<DocumentDetailPage kind="protocol" />} />
              <Route path="guidelines" element={<DocumentListPage kind="guideline" />} />
              <Route path="guidelines/:id" element={<DocumentDetailPage kind="guideline" />} />
              <Route path="chemotherapy-protocols" element={<ChemotherapyProtocolsPage />} />
              <Route path="chemotherapy-protocols/:id" element={<ChemotherapyProtocolDetailPage />} />
              <Route path="education" element={<DocumentListPage kind="education" />} />
              <Route path="education/:id" element={<DocumentDetailPage kind="education" />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="updates" element={<UpdatesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {LOCAL_ADMIN && LocalAdminRouteTree ? (
              <Route
                path="*"
                element={
                  <Suspense fallback={<div className="p-8 text-sm text-muted">Loading workspace…</div>}>
                    <LocalAdminRouteTree />
                  </Suspense>
                }
              />
            ) : (
              <>
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/workspace" element={<Navigate to="/" replace />} />
                <Route path="/admin/*" element={<Navigate to="/" replace />} />
              </>
            )}

            {/* Legacy unscoped formulary URLs → welcome / hospital selection */}
            <Route path="/search" element={<Navigate to="/" replace />} />
            <Route path="/drugs/*" element={<Navigate to="/" replace />} />
            <Route path="/drug-index" element={<Navigate to="/" replace />} />
            <Route path="/protocols-guidelines" element={<Navigate to="/" replace />} />
            <Route path="/protocols/*" element={<Navigate to="/" replace />} />
            <Route path="/guidelines/*" element={<Navigate to="/" replace />} />
            <Route path="/chemotherapy-protocols/*" element={<Navigate to="/" replace />} />
            <Route path="/education/*" element={<Navigate to="/" replace />} />
            <Route path="/about" element={<Navigate to="/" replace />} />
            <Route path="/resources" element={<Navigate to="/" replace />} />
            <Route path="/help" element={<Navigate to="/" replace />} />
            <Route path="/updates" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ContentProvider>
    </AuthProvider>
  );
}
