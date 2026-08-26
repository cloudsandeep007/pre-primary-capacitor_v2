import { lazy, Suspense, useEffect } from 'react';
import { RouterProvider, useRouter } from '@/lib/router';
import { initializeDeepLinking } from '@/lib/plugins/app';
import { initializePushNotifications } from '@/lib/plugins/notifications';
import { supabase } from '@/lib/supabase';
import { ToastContainer } from '@/components/Toast';
import { FullScreenSpinner } from '@/components/Spinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load every portal so a crash in one doesn't affect others
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const StaffPortal = lazy(() => import('@/pages/staff/StaffPortal').then(m => ({ default: m.StaffPortal })));
const ParentPortal = lazy(() => import('@/pages/parent/ParentPortal').then(m => ({ default: m.ParentPortal })));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const GatePortal = lazy(() => import('@/pages/gate/GatePortal').then(m => ({ default: m.GatePortal })));
const DiagnosticsPage = lazy(() => import('@/pages/diagnostics/DiagnosticsPage').then(m => ({ default: m.DiagnosticsPage })));

function AppContent() {
  const { route, navigate } = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const redirect = localStorage.getItem('authRedirect');
        if (redirect) {
          localStorage.removeItem('authRedirect');
          // small delay to let supabase-js finish session persistence
          setTimeout(() => navigate(redirect as any), 100);
        }
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [navigate]);

  return (
    <>
      <ToastContainer />
      <Suspense fallback={<FullScreenSpinner label="Loading..." />}>
        <ErrorBoundary name="LandingPage">{route === '/' && <LandingPage />}</ErrorBoundary>
        <ErrorBoundary name="StaffPortal">{route === '/staff' && <StaffPortal />}</ErrorBoundary>
        <ErrorBoundary name="ParentPortal">{route === '/parent' && <ParentPortal />}</ErrorBoundary>
        <ErrorBoundary name="AdminDashboard">{route === '/admin' && <AdminDashboard />}</ErrorBoundary>
        <ErrorBoundary name="GatePortal">{route === '/gate' && <GatePortal />}</ErrorBoundary>
        <ErrorBoundary name="DiagnosticsPage">{route === '/system-core' && <DiagnosticsPage />}</ErrorBoundary>
      </Suspense>
    </>
  );
}

function App() {
  useEffect(() => {
    initializeDeepLinking();

    // Listen for auth state changes globally to register for push notifications
    // once the user is authenticated.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Example role mapping, you might want to fetch actual role
        const role = session.user.user_metadata?.role || 'user';
        initializePushNotifications(session.user.id, role);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}

export default App;
