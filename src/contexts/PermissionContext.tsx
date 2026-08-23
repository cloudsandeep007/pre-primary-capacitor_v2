import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface PermissionContextType {
  permissions: string[];
  can: (permission: string) => boolean;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: [],
  can: () => false,
  loading: true,
  refreshPermissions: async () => {},
});

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async (session?: any) => {
    // If no session is provided, check the current one
    const activeSession = session ?? (await supabase.auth.getSession()).data.session;

    if (!activeSession) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_my_permissions');

      if (error) {
        logger.error('PERMISSION_FETCH_ERROR', { error: error.message });
        setPermissions([]);
      } else {
        const perms = (data as any[] || []).map(row => row.permission_name);
        setPermissions(perms);
        logger.info('PERMISSIONS_LOADED', { count: perms.length });
      }
    } catch (err) {
      logger.error('PERMISSION_FETCH_EXCEPTION', { error: String(err) });
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initial fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) fetchPermissions(session);
    });

    // Re-fetch on login / logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) fetchPermissions(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchPermissions]);

  const can = (permission: string) => {
    return permissions.includes(permission) || permissions.includes('system.manage');
  };

  // Exposed so admin panels can force a re-fetch after modifying role_permissions
  const refreshPermissions = useCallback(async () => {
    await fetchPermissions();
  }, [fetchPermissions]);

  return (
    <PermissionContext.Provider value={{ permissions, can, loading, refreshPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionContext);

