-- Drop the orphaned trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the orphaned function that references the deleted profiles table
DROP FUNCTION IF EXISTS public.handle_new_user();