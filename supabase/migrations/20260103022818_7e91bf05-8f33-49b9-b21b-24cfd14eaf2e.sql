-- Drop archetype_favorites first (has FK to archetypes)
DROP TABLE IF EXISTS public.archetype_favorites;

-- Drop archetypes table
DROP TABLE IF EXISTS public.archetypes;

-- Drop search_history table
DROP TABLE IF EXISTS public.search_history;

-- Drop scraped_decks table
DROP TABLE IF EXISTS public.scraped_decks;

-- Drop the trigger on auth.users that references profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the profiles table
DROP TABLE IF EXISTS public.profiles;

-- Drop the handle_new_user function (was only used for profiles)
DROP FUNCTION IF EXISTS public.handle_new_user();