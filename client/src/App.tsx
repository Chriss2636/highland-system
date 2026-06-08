import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import DashboardPage from './pages/DashboardPageNew';
import ClientsPage from './pages/ClientsPage';
import InvoicesPage from './pages/InvoicesPage';
import ReceiptsPage from './pages/ReceiptsPage';
import AgreementsPage from './pages/AgreementsPage';
import ProjectsPage from './pages/ProjectsPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import LeadsPage from './pages/LeadsPage';
import ForceResetPage from './pages/ForceResetPage';
import RequisitionsPage from './pages/RequisitionsPage';
import LoginPage from './pages/LoginPage';
import CompleteProfilePage from './pages/CompleteProfilePage'; // New Page
import { Loading } from './components/common';
import MasterReportsPage from './pages/MasterReportsPage';
import FinancialManagerPage from './pages/FinancialManagerPage';

/**
 * Protected Route Component
 * Checks if user has permission to access a resource
 */
const ProtectedRoute = ({
  element,
  resource
}: {
  element: React.ReactNode;
  resource: string;
}) => {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || '';

  const canViewLocal = (res: string) => {
    if (role === 'admin') return true;
    if (role === 'general director') {
      return ['projects', 'invoices', 'clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'dashboard', 'financial', 'leads'].includes(res);
    }
    if (role === 'client') {
      return ['clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'dashboard', 'financial'].includes(res);
    }
    if (role === 'assistant director') {
      return ['projects', 'invoices', 'clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'dashboard', 'financial', 'leads'].includes(res);
    }
    if (role === 'financial manager') {
      return ['dashboard', 'projects', 'invoices', 'clients', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'financial', 'leads'].includes(res);
    }
    if (role === 'staff') {
      return ['clients', 'projects', 'invoices', 'receipts', 'agreements', 'analytics', 'reports', 'requisitions', 'dashboard', 'financial', 'leads'].includes(res);
    }
    return false;
  };

  if (!canViewLocal(resource)) {
    return <Navigate to="/" replace />;
  }

  return element;
};

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950">
        <Loading />
      </div>
    );
  }

  return (
    <Routes>
      {/* 1. PUBLIC ROUTE */}
      <Route 
        path="/login" 
        element={!user ? <LoginPage /> : <Navigate to="/" />} 
      />

      {/* 2. ONBOARDING ROUTE: Forced for non-admins with incomplete profiles */}
      <Route 
        path="/complete-profile" 
        element={
          user ? (
            user.isProfileComplete || user.role?.toLowerCase() === 'admin' ? (
              <Navigate to="/" />
            ) : (
              <CompleteProfilePage />
            )
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      <Route path="/force-reset" element={<ForceResetPage />} />

      {/* 3. PROTECTED CORE SYSTEM */}
      <Route
        path="/*"
        element={
          user ? (
            // Logic: If not Admin and profile is not done, redirect to onboarding
            !user.isProfileComplete && user.role?.toLowerCase() !== 'admin' ? (
              <Navigate to="/complete-profile" replace />
            ) : (
              <Layout>
                <Routes>
                  <Route path="/" element={<ProtectedRoute element={<DashboardPage />} resource="dashboard" />} />
                  <Route path="/clients" element={<ProtectedRoute element={<ClientsPage />} resource="clients" />} />
                  <Route path="/projects" element={<ProtectedRoute element={<ProjectsPage />} resource="projects" />} />
                  <Route path="/invoices" element={<ProtectedRoute element={<InvoicesPage />} resource="invoices" />} />
                  <Route path="/receipts" element={<ProtectedRoute element={<ReceiptsPage />} resource="receipts" />} />
                  <Route path="/agreements" element={<ProtectedRoute element={<AgreementsPage />} resource="agreements" />} />
                  <Route path="/leads" element={<ProtectedRoute element={<LeadsPage />} resource="leads" />} />
                  <Route path="/reports" element={<ProtectedRoute element={<ReportsPage />} resource="reports" />} />
                  <Route path="/requisitions" element={<ProtectedRoute element={<RequisitionsPage />} resource="requisitions" />} />
                  <Route path="/master-reports" element={<ProtectedRoute element={<MasterReportsPage />} resource="analytics" />} />
                  <Route path="/financial-manager" element={<ProtectedRoute element={<FinancialManagerPage />} resource="financial" />} />
                  <Route path="/settings" element={<ProtectedRoute element={<SettingsPage />} resource="settings" />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Layout>
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      {/* Catch-all: unauthenticated visitors land on login */}
      <Route path="*" element={!user ? <Navigate to="/login" replace /> : <Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;