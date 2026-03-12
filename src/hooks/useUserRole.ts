/**
 * Hook to check if current user has a specific role.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/core/logger';

export function useUserRole(role: 'admin' | 'moderator' | 'user') {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<{ hasRole: boolean; isLoading: boolean }>({
    hasRole: false,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setState({ hasRole: false, isLoading: true });
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      setState({ hasRole: false, isLoading: false });
      return () => {
        cancelled = true;
      };
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    const checkRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', role)
          .maybeSingle();

        if (error) throw error;

        if (!cancelled) {
          setState({ hasRole: !!data, isLoading: false });
        }
      } catch (err) {
        logger.error('[useUserRole] Failed to check role:', err);
        if (!cancelled) {
          setState({ hasRole: false, isLoading: false });
        }
      }
    };

    void checkRole();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, role]);

  return { hasRole: state.hasRole, isLoading: state.isLoading };
}

