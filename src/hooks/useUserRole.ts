/**
 * Hook to check if current user has a specific role.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUserRole(role: 'admin' | 'moderator' | 'user') {
  const { user } = useAuth();
  const [hasRole, setHasRole] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasRole(false);
      setIsLoading(false);
      return;
    }

    const checkRole = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', role)
        .maybeSingle();

      setHasRole(!!data);
      setIsLoading(false);
    };

    checkRole();
  }, [user, role]);

  return { hasRole, isLoading };
}
