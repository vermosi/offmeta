-- Prevent future invalid Scryfall syntax in translation_rules
CREATE OR REPLACE FUNCTION public.validate_scryfall_syntax()
RETURNS TRIGGER AS $$
BEGIN
  -- Block invalid Scryfall API syntax (function: only works on website with Tagger)
  IF NEW.scryfall_syntax ILIKE '%function:%' THEN
    RAISE EXCEPTION 'Invalid Scryfall syntax: function: parameter not supported by API';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER check_scryfall_syntax
BEFORE INSERT OR UPDATE ON public.translation_rules
FOR EACH ROW EXECUTE FUNCTION public.validate_scryfall_syntax();