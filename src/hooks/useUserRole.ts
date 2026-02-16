/**
 * Hook to check if current user has a specific role.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUserRole(role: 'admin' | 'moderator' | 'user') {
  const { user } = useAuth();
  const [state, setState] = useState<{ hasRole: boolean; isLoading: boolean; userId: string | null }>({
    hasRole: false,
    isLoading: !!user,
    userId: user?.id ?? null,
  });

  // Render-phase sync when user changes
  const currentUserId = user?.id ?? null;
  if (currentUserId !== state.userId) {
    setState({ hasRole: false, isLoading: !!user, userId: currentUserId });
  }

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const checkRole = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', role)
        .maybeSingle();

      if (!cancelled) {
        setState((s) => ({ ...s, hasRole: !!data, isLoading: false }));
      }
    };

    checkRole();
    return () => { cancelled = true; };
  }, [user, role]);

  return { hasRole: state.hasRole, isLoading: state.isLoading };
}
