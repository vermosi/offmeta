/**
 * Hooks for user notifications.
 * @module hooks/useNotifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
}

const NOTIFICATIONS_KEY = 'user-notifications';

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as UserNotification[];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export function useUnreadCount() {
  const { data } = useNotifications();
  if (!data) return 0;
  return data.filter((n) => !n.read).length;
}

export function useMarkNotificationRead() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}

export function useMarkAllRead() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('user_id', user!.id)
        .eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}
