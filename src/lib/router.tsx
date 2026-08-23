import { ReactNode } from 'react';
import { HashRouter, useNavigate, useLocation } from 'react-router-dom';

export type Route = '/' | '/staff' | '/parent' | '/admin' | '/gate' | '/onboarding/staff' | '/onboarding/parent' | '/system-core';

export function RouterProvider({ children }: { children: ReactNode }) {
  // We use HashRouter because it works seamlessly on web and inside Capacitor 
  // without needing complex deep-linking/server configuration for simple routing.
  return <HashRouter>{children}</HashRouter>;
}

export function useRouter() {
  const navigateBase = useNavigate();
  const location = useLocation();

  const navigate = (to: Route) => {
    navigateBase(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Ensure the route conforms to our Route type for App.tsx conditional rendering
  const currentRoute = (location.pathname === '/' ? '/' : location.pathname) as Route;

  return {
    route: currentRoute,
    navigate
  };
}
