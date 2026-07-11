import { supabase } from '@/integrations/supabase/client';
import { env } from '@/lib/core/env';

export async function getAdminAccessToken(): Promise<string> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) {
    throw new Error('Not authenticated');
  }
  return token;
}

export async function fetchAdminJson<T>(
  path: string,
  token: string,
): Promise<T> {
  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/functions/v1/${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    },
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(errBody || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}
