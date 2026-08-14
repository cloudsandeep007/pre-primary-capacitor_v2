import { lazy, Suspense } from 'react';
import { RouterProvider, useRouter } from '@/lib/router';
import { ToastContainer } from '@/components/Toast';
import { FullScreenSpinner } from '@/components/Spinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load every portal so a crash in one doesn't affect others
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const StaffPortal = lazy(() => import('@/pages/staff/StaffPortal').then(m => ({ default: m.StaffPortal })));
const ParentPortal = lazy(() => import('@/pages/parent/ParentPortal').then(m => ({ default: m.ParentPortal })));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const GatePortal = lazy(() => import('@/pages/gate/GatePortal').then(m => ({ default: m.GatePortal })));
const StaffOnboarding = lazy(() => import('@/pages/staff/StaffOnboarding').then(m => ({ default: m.StaffOnboarding })));
const ParentOnboarding = lazy(() => import('@/pages/parent/ParentOnboarding').then(m => ({ default: m.ParentOnboarding })));

function AppContent() {
  const { route } = useRouter();

  return (
    <>
      <ToastContainer />
      <Suspense fallback={<FullScreenSpinner label="Loading..." />}>
        <ErrorBoundary name="LandingPage">{route === '/' && <LandingPage />}</ErrorBoundary>
        <ErrorBoundary name="StaffPortal">{route === '/staff' && <StaffPortal />}</ErrorBoundary>
        <ErrorBoundary name="ParentPortal">{route === '/parent' && <ParentPortal />}</ErrorBoundary>
        <ErrorBoundary name="AdminDashboard">{route === '/admin' && <AdminDashboard />}</ErrorBoundary>
        <ErrorBoundary name="GatePortal">{route === '/gate' && <GatePortal />}</ErrorBoundary>
        <ErrorBoundary name="StaffOnboarding">{route === '/onboarding/staff' && <StaffOnboarding />}</ErrorBoundary>
        <ErrorBoundary name="ParentOnboarding">{route === '/onboarding/parent' && <ParentOnboarding />}</ErrorBoundary>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}

export default App;
