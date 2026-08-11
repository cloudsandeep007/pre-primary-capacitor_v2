import { RouterProvider, useRouter } from '@/lib/router';
import { ToastContainer } from '@/components/Toast';
import { LandingPage } from '@/pages/LandingPage';
import { StaffPortal } from '@/pages/staff/StaffPortal';
import { ParentPortal } from '@/pages/parent/ParentPortal';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { StaffOnboarding } from '@/pages/staff/StaffOnboarding';
import { ParentOnboarding } from '@/pages/parent/ParentOnboarding';

function AppContent() {
  const { route } = useRouter();

  return (
    <>
      <ToastContainer />
      {route === '/' && <LandingPage />}
      {route === '/staff' && <StaffPortal />}
      {route === '/parent' && <ParentPortal />}
      {route === '/admin' && <AdminDashboard />}
      {route === '/onboarding/staff' && <StaffOnboarding />}
      {route === '/onboarding/parent' && <ParentOnboarding />}
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
