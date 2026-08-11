import { RouterProvider, useRouter } from '@/lib/router';
import { ToastContainer } from '@/components/Toast';
import { LandingPage } from '@/pages/LandingPage';
import { StaffPortal } from '@/pages/staff/StaffPortal';
import { ParentPortal } from '@/pages/parent/ParentPortal';

function AppContent() {
  const { route } = useRouter();

  return (
    <>
      <ToastContainer />
      {route === '/' && <LandingPage />}
      {route === '/staff' && <StaffPortal />}
      {route === '/parent' && <ParentPortal />}
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
