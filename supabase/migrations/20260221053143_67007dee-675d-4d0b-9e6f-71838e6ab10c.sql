
-- 1. Input validation triggers for search_feedback and analytics_events

-- search_feedback: limit issue_description to 2000 chars, original_query to 1000 chars
CREATE OR REPLACE FUNCTION public.validate_search_feedback()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(NEW.issue_description) > 2000 THEN
    RAISE EXCEPTION 'issue_description exceeds 2000 character limit';
  END IF;
  IF length(NEW.original_query) > 1000 THEN
    RAISE EXCEPTION 'original_query exceeds 1000 character limit';
  END IF;
  IF NEW.translated_query IS NOT NULL AND length(NEW.translated_query) > 2000 THEN
    RAISE EXCEPTION 'translated_query exceeds 2000 character limit';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_search_feedback_before_insert
BEFORE INSERT ON public.search_feedback
FOR EACH ROW
EXECUTE FUNCTION public.validate_search_feedback();

-- analytics_events: limit event_type to 100 chars, session_id to 200 chars, event_data size
CREATE OR REPLACE FUNCTION public.validate_analytics_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(NEW.event_type) > 100 THEN
    RAISE EXCEPTION 'event_type exceeds 100 character limit';
  END IF;
  IF NEW.session_id IS NOT NULL AND length(NEW.session_id) > 200 THEN
    RAISE EXCEPTION 'session_id exceeds 200 character limit';
  END IF;
  IF length(NEW.event_data::text) > 10000 THEN
    RAISE EXCEPTION 'event_data exceeds 10KB limit';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_analytics_event_before_insert
BEFORE INSERT ON public.analytics_events
FOR EACH ROW
EXECUTE FUNCTION public.validate_analytics_event();

-- 2. Tighten RLS policies to authenticated role where appropriate

-- profiles: restrict to authenticated only
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- saved_searches: restrict to authenticated only
DROP POLICY IF EXISTS "Users can view own saved searches" ON public.saved_searches;
CREATE POLICY "Users can view own saved searches"
ON public.saved_searches FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved searches" ON public.saved_searches;
CREATE POLICY "Users can insert own saved searches"
ON public.saved_searches FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND (SELECT count(*) FROM saved_searches WHERE user_id = auth.uid()) < 100);

DROP POLICY IF EXISTS "Users can delete own saved searches" ON public.saved_searches;
CREATE POLICY "Users can delete own saved searches"
ON public.saved_searches FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved searches" ON public.saved_searches;
CREATE POLICY "Users can update own saved searches"
ON public.saved_searches FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- user_roles: restrict to authenticated only
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 3. Add performance index for decks query
CREATE INDEX IF NOT EXISTS idx_decks_user_updated ON public.decks (user_id, updated_at DESC);
