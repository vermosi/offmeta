update public.translation_rules
set scryfall_syntax = replace(scryfall_syntax, 'is:banned', 'banned:commander')
where scryfall_syntax like '%is:banned%';