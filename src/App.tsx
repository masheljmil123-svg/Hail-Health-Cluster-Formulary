import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ContentProvider } from '@/hooks/useContent';
import { AboutPage, HelpPage, NotFoundPage, ResourcesPage, UpdatesPage } from '@/pages/InfoPages';
import { DrugDetailPage } from '@/pages/DrugDetailPage';
import { DrugIndexPage } from '@/pages/DrugIndexPage';
import { ChemotherapyProtocolDetailPage, ChemotherapyProtocolsPage } from '@/pages/ChemotherapyPages';
import { DocumentDetailPage, DocumentListPage, ProtocolsGuidelinesPage } from '@/pages/DocumentPages';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { SearchPage } from '@/pages/SearchPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { ActivityPage } from '@/pages/admin/ActivityPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { DocumentEditor, DocumentsAdmin } from '@/pages/admin/DocumentsAdmin';
import { DrugEditor, DrugsAdmin } from '@/pages/admin/DrugsAdmin';
import { MediaPage } from '@/pages/admin/MediaPage';
import { ReviewDetailPage, ReviewRequestsPage } from '@/pages/admin/ReviewRequestsPage';
import { SectionsPage } from '@/pages/admin/SectionsPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { TherapeuticClassEditor, TherapeuticClassesAdmin } from '@/pages/admin/TherapeuticClassesAdmin';
import { UsersPage } from '@/pages/admin/UsersPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

function AdminHome() {
  const { allowed } = useAuth();
  if (!allowed('content:review')) return <Navigate to="/workspace" replace />;
  return <DashboardPage />;
}

export function App() {
  return (
    <AuthProvider>
      <ContentProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="workspace" element={<WorkspacePage />} />
                <Route path="admin">
                  <Route index element={<AdminHome />} />
                  <Route path="review-requests" element={<ReviewRequestsPage />} />
                  <Route path="review-requests/:kind/:id" element={<ReviewDetailPage />} />
                  <Route path="drugs" element={<DrugsAdmin />} />
                  <Route path="drugs/new" element={<DrugEditor />} />
                  <Route path="drugs/:id" element={<DrugEditor />} />
                  <Route path="therapeutic-classes" element={<TherapeuticClassesAdmin />} />
                  <Route path="therapeutic-classes/new" element={<TherapeuticClassEditor />} />
                  <Route path="therapeutic-classes/:id" element={<TherapeuticClassEditor />} />
                  <Route path="protocols" element={<DocumentsAdmin kind="protocol" />} />
                  <Route path="protocols/new" element={<DocumentEditor kind="protocol" />} />
                  <Route path="protocols/:id" element={<DocumentEditor kind="protocol" />} />
                  <Route path="guidelines" element={<DocumentsAdmin kind="guideline" />} />
                  <Route path="guidelines/new" element={<DocumentEditor kind="guideline" />} />
                  <Route path="guidelines/:id" element={<DocumentEditor kind="guideline" />} />
                  <Route path="chemotherapy" element={<DocumentsAdmin kind="chemotherapy" />} />
                  <Route path="chemotherapy/new" element={<DocumentEditor kind="chemotherapy" />} />
                  <Route path="chemotherapy/:id" element={<DocumentEditor kind="chemotherapy" />} />
                  <Route path="education" element={<DocumentsAdmin kind="education" />} />
                  <Route path="education/new" element={<DocumentEditor kind="education" />} />
                  <Route path="education/:id" element={<DocumentEditor kind="education" />} />
                  <Route path="sections" element={<SectionsPage />} />
                  <Route path="media" element={<MediaPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="activity" element={<ActivityPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/drugs/:id" element={<DrugDetailPage />} />
              <Route path="/drug-index" element={<DrugIndexPage />} />
              <Route path="/protocols-guidelines" element={<ProtocolsGuidelinesPage />} />
              <Route path="/protocols" element={<DocumentListPage kind="protocol" />} />
              <Route path="/protocols/:id" element={<DocumentDetailPage kind="protocol" />} />
              <Route path="/guidelines" element={<DocumentListPage kind="guideline" />} />
              <Route path="/guidelines/:id" element={<DocumentDetailPage kind="guideline" />} />
              <Route path="/chemotherapy-protocols" element={<ChemotherapyProtocolsPage />} />
              <Route path="/chemotherapy-protocols/:id" element={<ChemotherapyProtocolDetailPage />} />
              <Route path="/education" element={<DocumentListPage kind="education" />} />
              <Route path="/education/:id" element={<DocumentDetailPage kind="education" />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/updates" element={<UpdatesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ContentProvider>
    </AuthProvider>
  );
}
