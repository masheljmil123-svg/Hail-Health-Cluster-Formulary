import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AuthProvider } from '@/hooks/useAuth';
import { ContentProvider } from '@/hooks/useContent';
import { AboutPage, HelpPage, NotFoundPage, ResourcesPage, UpdatesPage } from '@/pages/InfoPages';
import { DrugDetailPage } from '@/pages/DrugDetailPage';
import { DrugIndexPage } from '@/pages/DrugIndexPage';
import { DocumentDetailPage, DocumentListPage } from '@/pages/DocumentPages';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { SearchPage } from '@/pages/SearchPage';
import { ActivityPage } from '@/pages/admin/ActivityPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { DocumentEditor, DocumentsAdmin } from '@/pages/admin/DocumentsAdmin';
import { DrugEditor, DrugsAdmin } from '@/pages/admin/DrugsAdmin';
import { MediaPage } from '@/pages/admin/MediaPage';
import { SectionsPage } from '@/pages/admin/SectionsPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

export function App() {
  return (
    <AuthProvider>
      <ContentProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="drugs" element={<DrugsAdmin />} />
                <Route path="drugs/new" element={<DrugEditor />} />
                <Route path="drugs/:id" element={<DrugEditor />} />
                <Route path="protocols" element={<DocumentsAdmin kind="protocol" />} />
                <Route path="protocols/new" element={<DocumentEditor kind="protocol" />} />
                <Route path="protocols/:id" element={<DocumentEditor kind="protocol" />} />
                <Route path="guidelines" element={<DocumentsAdmin kind="guideline" />} />
                <Route path="guidelines/new" element={<DocumentEditor kind="guideline" />} />
                <Route path="guidelines/:id" element={<DocumentEditor kind="guideline" />} />
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
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/drugs/:id" element={<DrugDetailPage />} />
              <Route path="/drug-index" element={<DrugIndexPage />} />
              <Route path="/protocols" element={<DocumentListPage kind="protocol" />} />
              <Route path="/protocols/:id" element={<DocumentDetailPage kind="protocol" />} />
              <Route path="/guidelines" element={<DocumentListPage kind="guideline" />} />
              <Route path="/guidelines/:id" element={<DocumentDetailPage kind="guideline" />} />
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
