import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Route = '/' | '/staff' | '/parent';

interface RouterContextValue {
  route: Route;
  navigate: (to: Route) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function getRouteFromHash(): Route {
  const hash = window.location.hash.replace('#', '');
  if (hash === '/staff') return '/staff';
  if (hash === '/parent') return '/parent';
  return '/';
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(getRouteFromHash());

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (to: Route) => {
    window.location.hash = to;
    setRoute(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <RouterContext.Provider value={{ route, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
