-- Update the validation function to enforce tighter limits matching client-side
CREATE OR REPLACE FUNCTION public.validate_search_feedback()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF length(NEW.original_query) > 500 THEN
    RAISE EXCEPTION 'original_query exceeds 500 character limit';
  END IF;
  IF length(NEW.issue_description) > 2000 THEN
    RAISE EXCEPTION 'issue_description exceeds 2000 character limit';
  END IF;
  IF NEW.translated_query IS NOT NULL AND length(NEW.translated_query) > 1000 THEN
    RAISE EXCEPTION 'translated_query exceeds 1000 character limit';
  END IF;
  RETURN NEW;
END;
$function$;

-- Also fire on UPDATE
DROP TRIGGER IF EXISTS validate_search_feedback_before_update ON public.search_feedback;
CREATE TRIGGER validate_search_feedback_before_update
  BEFORE UPDATE ON public.search_feedback
  FOR EACH ROW EXECUTE FUNCTION public.validate_search_feedback();