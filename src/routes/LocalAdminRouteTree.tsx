import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { homePathForRole } from '@/config/roleHome';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/LoginPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { ActivityPage } from '@/pages/admin/ActivityPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { DocumentEditor, DocumentsAdmin } from '@/pages/admin/DocumentsAdmin';
import { DrugEditor, DrugsAdmin } from '@/pages/admin/DrugsAdmin';
import { HospitalsAdmin } from '@/pages/admin/HospitalsAdmin';
import { MediaPage } from '@/pages/admin/MediaPage';
import { ReviewDetailPage, ReviewRequestsPage } from '@/pages/admin/ReviewRequestsPage';
import { SectionsPage } from '@/pages/admin/SectionsPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { TherapeuticClassEditor, TherapeuticClassesAdmin } from '@/pages/admin/TherapeuticClassesAdmin';
import { UsersPage } from '@/pages/admin/UsersPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

function AdminHome() {
  const { allowed, session } = useAuth();
  if (!allowed('content:review')) return <Navigate to={homePathForRole(session?.role)} replace />;
  return <DashboardPage />;
}

function LegacyReviewRedirect() {
  const { kind, id } = useParams();
  if (kind === 'drug' && id) return <Navigate to={`/admin/drugs/${id}?review=1`} replace />;
  if (kind && id) return <Navigate to={`/admin/review-requests/${kind}/${id}`} replace />;
  return <Navigate to="/admin/review-requests" replace />;
}

/**
 * Login + workspace + admin routes for local evaluation builds only.
 * Loaded via conditional lazy import so production GitHub Pages omits this chunk.
 */
export default function LocalAdminRouteTree() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/review-requests" element={<ReviewRequestsPage />} />
          <Route path="/admin/review-requests/:kind/:id" element={<ReviewDetailPage />} />
          <Route path="/admin/review-publishing" element={<Navigate to="/admin/review-requests" replace />} />
          <Route path="/admin/review-publishing/:kind/:id" element={<LegacyReviewRedirect />} />
          <Route path="/admin/drugs" element={<DrugsAdmin />} />
          <Route path="/admin/drugs/new" element={<DrugEditor />} />
          <Route path="/admin/drugs/:id" element={<DrugEditor />} />
          <Route path="/admin/therapeutic-classes" element={<TherapeuticClassesAdmin />} />
          <Route path="/admin/therapeutic-classes/new" element={<TherapeuticClassEditor />} />
          <Route path="/admin/therapeutic-classes/:id" element={<TherapeuticClassEditor />} />
          <Route path="/admin/protocols" element={<DocumentsAdmin kind="protocol" />} />
          <Route path="/admin/protocols/new" element={<DocumentEditor kind="protocol" />} />
          <Route path="/admin/protocols/:id" element={<DocumentEditor kind="protocol" />} />
          <Route path="/admin/guidelines" element={<DocumentsAdmin kind="guideline" />} />
          <Route path="/admin/guidelines/new" element={<DocumentEditor kind="guideline" />} />
          <Route path="/admin/guidelines/:id" element={<DocumentEditor kind="guideline" />} />
          <Route path="/admin/chemotherapy" element={<DocumentsAdmin kind="chemotherapy" />} />
          <Route path="/admin/chemotherapy/new" element={<DocumentEditor kind="chemotherapy" />} />
          <Route path="/admin/chemotherapy/:id" element={<DocumentEditor kind="chemotherapy" />} />
          <Route path="/admin/education" element={<DocumentsAdmin kind="education" />} />
          <Route path="/admin/education/new" element={<DocumentEditor kind="education" />} />
          <Route path="/admin/education/:id" element={<DocumentEditor kind="education" />} />
          <Route path="/admin/hospitals" element={<HospitalsAdmin />} />
          <Route path="/admin/sections" element={<SectionsPage />} />
          <Route path="/admin/media" element={<MediaPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/activity" element={<ActivityPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
