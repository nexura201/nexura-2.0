import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';

// Error Boundary para capturar errores de React
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-deep text-white p-4">
          <div className="max-w-md text-center">
            <h1 className="text-4xl font-bold mb-4 text-error">¡Oops!</h1>
            <p className="text-xl mb-4">Algo salió mal</p>
            <p className="text-text-secondary mb-6">
              {this.state.error?.message || 'Error inesperado'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Páginas
import { LandingPage } from './pages/LandingPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ProfilePage, ChannelPage } from './pages/ProfileChannel';
import { DashboardPage } from './pages/DashboardPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/Settings';
import { AdminPage } from './pages/AdminOwner';
import { ExplorePage, FollowingPage, CategoriesPage, LibraryPage } from './pages/NavigationPages';
import { SearchPage } from './pages/SearchPage';
import { CategoryPage } from './pages/CategoryPage';
import { VideoPage } from './pages/VideoPage';
import { ClipPage } from './pages/ClipPage';
import { ReelsPage } from './pages/ReelsPage';
import { StreamConfigPage } from './pages/StreamConfig';
import { StreamTestPage } from './pages/StreamTest';
import { MonetizationDashboard } from './pages/MonetizationDashboard';
import { MonetizationSettingsPage } from './pages/MonetizationSettings';
import { SecuritySettingsPage } from './pages/SecuritySettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SecurityDashboardPage } from './pages/SecurityDashboardPage';
import { InfrastructureDashboardPage } from './pages/InfrastructureDashboardPage';
import { QueueDashboardPage } from './pages/QueueDashboardPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { CookiesPage } from './pages/CookiesPage';
import { CommunityGuidelinesPage } from './pages/CommunityGuidelinesPage';
import { ContentPolicyPage } from './pages/ContentPolicyPage';
import { SupportPage } from './pages/SupportPage';
import { MyTicketsPage, TicketDetailPage } from './pages/SupportTickets';
import { SupportAdminPage } from './pages/SupportAdmin';
import { OwnerLayout } from './pages/owner/OwnerLayout';
import { OwnerDashboardPage } from './pages/owner/OwnerDashboard';
import { OwnerUsersPage, OwnerUserDetailPage } from './pages/owner/OwnerUsersPage';
import { OwnerChannelsPage, OwnerLivesPage, OwnerReelsPage, OwnerCalendarPage } from './pages/owner/OwnerContentPages';
import { OwnerSettingsPage, OwnerSecurityPage, OwnerActivityPage } from './pages/owner/OwnerSettingsPage';
import { StatusPage } from './pages/StatusPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { ServerErrorPage } from './pages/ServerErrorPage';
import { MaintenancePage } from './pages/MaintenancePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-deep">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Gate exclusivo del Control Center OWNER (usa el MISMO sistema de autenticación/roles existente).
function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-deep">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'OWNER') {
    return (
      <div className="min-h-screen bg-surface-deep flex items-center justify-center p-4">
        <div className="bg-bg-card border border-border rounded-xl p-10 text-center max-w-md">
          <p className="text-text-secondary">Solo el propietario de la plataforma puede acceder al Control Center.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

// Placeholder profesional para secciones en preparación (sin funcionalidad falsa).
function OwnerComingSoon({ title }: { title: string }) {
  return (
    <OwnerLayout title={title}>
      <div className="bg-bg-card border border-border rounded-2xl p-10 sm:p-14 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-primary-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Esta sección se encuentra en preparación.</h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
          La navegación y la estructura del panel ya están conectadas. La funcionalidad real de «{title}»
          se implementará en una próxima etapa, sin estados simulados ni datos inventados.
        </p>
      </div>
    </OwnerLayout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Layout><LandingPage /></Layout>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/explore" element={<Layout><ExplorePage /></Layout>} />
      <Route path="/categories" element={<Layout><CategoriesPage /></Layout>} />
      <Route path="/search" element={<Layout><SearchPage /></Layout>} />
      <Route path="/category/:slug" element={<Layout><CategoryPage /></Layout>} />
      <Route path="/u/:username" element={<Layout><ProfilePage /></Layout>} />
      <Route path="/channel/:username" element={<Layout><ChannelPage /></Layout>} />
      <Route path="/video/:id" element={<Layout><VideoPage /></Layout>} />
      <Route path="/clip/:id" element={<Layout><ClipPage /></Layout>} />
      <Route path="/reels" element={<Layout><ReelsPage /></Layout>} />
      
      {/* Rutas legales */}
      <Route path="/terms" element={<Layout><TermsPage /></Layout>} />
      <Route path="/privacy" element={<Layout><PrivacyPage /></Layout>} />
      <Route path="/cookies" element={<Layout><CookiesPage /></Layout>} />
      <Route path="/community-guidelines" element={<Layout><CommunityGuidelinesPage /></Layout>} />
      <Route path="/content-policy" element={<Layout><ContentPolicyPage /></Layout>} />
      <Route path="/support" element={<Layout><SupportPage /></Layout>} />
      <Route path="/support/tickets" element={<Layout><MyTicketsPage /></Layout>} />
      <Route path="/support/tickets/:id" element={<Layout><TicketDetailPage /></Layout>} />
      <Route path="/status" element={<Layout><StatusPage /></Layout>} />
      
      {/* Rutas protegidas */}
      <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/dashboard/stream" element={<ProtectedRoute><Layout><StreamConfigPage /></Layout></ProtectedRoute>} />
      <Route path="/dashboard/analytics" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/dashboard/monetization" element={<ProtectedRoute><Layout><MonetizationDashboard /></Layout></ProtectedRoute>} />
      <Route path="/dashboard/monetization/settings" element={<ProtectedRoute><Layout><MonetizationSettingsPage /></Layout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
      <Route path="/settings/security" element={<ProtectedRoute><Layout><SecuritySettingsPage /></Layout></ProtectedRoute>} />
      <Route path="/settings/notifications" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
      <Route path="/following" element={<ProtectedRoute><Layout><FollowingPage /></Layout></ProtectedRoute>} />
      <Route path="/library" element={<ProtectedRoute><Layout><LibraryPage /></Layout></ProtectedRoute>} />
      <Route path="/stream-test" element={<ProtectedRoute><Layout><StreamTestPage /></Layout></ProtectedRoute>} />
      <Route path="/moderation/reports" element={<ProtectedRoute><Layout><ReportsPage /></Layout></ProtectedRoute>} />
      
      {/* Rutas administrativas */}
      <Route path="/admin" element={<ProtectedRoute><Layout><AdminPage /></Layout></ProtectedRoute>} />
      <Route path="/admin/security" element={<ProtectedRoute><Layout><SecurityDashboardPage /></Layout></ProtectedRoute>} />

      {/* Control Center OWNER 2.0 — sidebar exclusivo, gate con la auth existente */}
      <Route path="/owner" element={<OwnerRoute><OwnerDashboardPage /></OwnerRoute>} />
      <Route path="/owner/users" element={<OwnerRoute><OwnerUsersPage /></OwnerRoute>} />
      <Route path="/owner/users/:id" element={<OwnerRoute><OwnerUserDetailPage /></OwnerRoute>} />
      <Route path="/owner/channels" element={<OwnerRoute><OwnerChannelsPage /></OwnerRoute>} />
      <Route path="/owner/lives" element={<OwnerRoute><OwnerLivesPage /></OwnerRoute>} />
      <Route path="/owner/reels" element={<OwnerRoute><OwnerReelsPage /></OwnerRoute>} />
      <Route path="/owner/calendar" element={<OwnerRoute><OwnerCalendarPage /></OwnerRoute>} />
      <Route path="/owner/support" element={<OwnerRoute><SupportAdminPage /></OwnerRoute>} />
      <Route path="/owner/settings" element={<OwnerRoute><OwnerSettingsPage /></OwnerRoute>} />
      <Route path="/owner/security" element={<OwnerRoute><OwnerSecurityPage /></OwnerRoute>} />
      <Route path="/owner/activity" element={<OwnerRoute><OwnerActivityPage /></OwnerRoute>} />
      <Route path="/owner/infrastructure" element={<OwnerRoute><InfrastructureDashboardPage /></OwnerRoute>} />
      <Route path="/owner/infrastructure/queues" element={<OwnerRoute><QueueDashboardPage /></OwnerRoute>} />
      {/* Secciones estructurales en preparación (sin funcionalidad simulada) */}
      <Route path="/owner/servers" element={<OwnerRoute><OwnerComingSoon title="Servidores" /></OwnerRoute>} />
      
      {/* Páginas de error */}
      <Route path="/401" element={<UnauthorizedPage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/500" element={<ServerErrorPage />} />
      <Route path="/maintenance" element={<MaintenancePage />} />
      
      {/* Catch-all */}
      <Route path="*" element={<Layout><NotFoundPage /></Layout>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
