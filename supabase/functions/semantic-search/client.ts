import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateEnv } from '../_shared/env.ts';

export const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LOVABLE_API_KEY } =
  validateEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'LOVABLE_API_KEY']);

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
