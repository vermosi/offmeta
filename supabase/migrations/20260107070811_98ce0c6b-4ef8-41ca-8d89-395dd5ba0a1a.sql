-- Seed high-impact patterns for common MTG queries
-- These patterns bypass AI entirely, saving ~$0.0001 per query

INSERT INTO public.translation_rules (pattern, scryfall_syntax, confidence, description, is_active) VALUES
-- Ramp variations
('cheap green ramp', 'c:g (o:"search" o:"land" or o:"add" o:"{") usd<5', 0.95, 'Budget green mana acceleration', true),
('cheap ramp', '(o:"search" o:"land" or o:"add" o:"{") usd<5', 0.95, 'Budget mana acceleration', true),
('green ramp spells', 'c:g (t:instant or t:sorcery) (o:"search" o:"land" or o:"add" o:"mana")', 0.95, 'Green instant/sorcery ramp', true),
('mana rocks', 't:artifact o:"add" o:"{"', 0.95, 'Mana-producing artifacts', true),
('mana dorks', 't:creature o:"add" o:"{"', 0.95, 'Mana-producing creatures', true),
('cheap mana rocks', 't:artifact o:"add" o:"{" usd<3', 0.95, 'Budget mana artifacts', true),

-- Card draw variations
('card draw', 'o:"draw" o:"card"', 0.95, 'Cards that draw cards', true),
('cheap card draw', 'o:"draw" o:"card" usd<3', 0.95, 'Budget card draw', true),
('blue card draw', 'c:u o:"draw" o:"card"', 0.95, 'Blue card draw', true),
('black card draw', 'c:b o:"draw" o:"card"', 0.95, 'Black card draw', true),

-- Removal variations
('creature removal', '(o:"destroy target creature" or o:"exile target creature")', 0.95, 'Creature removal', true),
('artifact removal', '(o:"destroy target artifact" or o:"exile target artifact")', 0.95, 'Artifact removal', true),
('enchantment removal', '(o:"destroy target enchantment" or o:"exile target enchantment")', 0.95, 'Enchantment removal', true),
('board wipes', '(o:"destroy all" or o:"exile all")', 0.95, 'Mass removal', true),
('cheap removal', '(o:"destroy target" or o:"exile target") usd<3', 0.95, 'Budget removal', true),
('white board wipes', 'c:w (o:"destroy all" or o:"exile all")', 0.95, 'White mass removal', true),

-- Tutors
('tutors', 'o:"search your library"', 0.95, 'Library search effects', true),
('black tutors', 'c:b o:"search your library"', 0.95, 'Black tutors', true),
('cheap tutors', 'o:"search your library" usd<5', 0.95, 'Budget tutors', true),

-- Counterspells
('counterspells', 't:instant o:"counter target"', 0.95, 'Counter magic', true),
('cheap counterspells', 't:instant o:"counter target" usd<3', 0.95, 'Budget counters', true),
('free counterspells', 't:instant o:"counter" o:"without paying"', 0.95, 'Free counters', true),

-- Treasure
('creatures that make treasure', 't:creature o:"create" o:"Treasure"', 0.95, 'Treasure-making creatures', true),
('treasure makers', 'o:"create" o:"Treasure"', 0.95, 'Treasure token creators', true),
('treasure tokens', 'o:"create" o:"Treasure token"', 0.95, 'Treasure token creators', true),

-- Token generators
('token generators', 'o:"create" o:"token"', 0.95, 'Token creators', true),
('creature tokens', 'o:"create" o:"creature token"', 0.95, 'Creature token makers', true),

-- Sacrifice
('sacrifice outlets', 'o:"sacrifice" o:":"', 0.95, 'Free sacrifice outlets', true),
('aristocrats', '(o:"whenever" o:"dies" or o:"sacrifice")', 0.90, 'Death trigger / sacrifice synergy', true),
('grave pact effects', 'o:"whenever" o:"creature you control dies" o:"sacrifice"', 0.95, 'Grave Pact-like effects', true),

-- Lifegain
('lifegain', 'o:"gain" o:"life"', 0.95, 'Life gain effects', true),
('lifegain payoffs', 'o:"whenever you gain life"', 0.95, 'Lifegain triggers', true),

-- Graveyard
('graveyard hate', 'o:"exile" o:"graveyard"', 0.95, 'Graveyard removal', true),
('reanimation', '(t:instant or t:sorcery) o:"graveyard" o:"onto the battlefield"', 0.95, 'Reanimation spells', true),

-- ETB/LTB
('etb creatures', 't:creature o:"enters"', 0.95, 'ETB trigger creatures', true),
('blink effects', 'o:"exile" o:"return" o:"battlefield"', 0.95, 'Blink/flicker effects', true),

-- Equipment and Auras
('equipment', 't:equipment', 0.95, 'Equipment cards', true),
('cheap equipment', 't:equipment usd<3', 0.95, 'Budget equipment', true),
('auras', 't:aura', 0.95, 'Aura enchantments', true),

-- Lands
('fetch lands', 't:land o:"search your library" o:"land"', 0.95, 'Fetchlands', true),
('dual lands', 't:land (t:plains or t:island or t:swamp or t:mountain or t:forest) -(t:basic)', 0.95, 'Dual type lands', true),
('cheap lands', 't:land usd<5', 0.90, 'Budget lands', true),

-- Planeswalkers
('planeswalkers', 't:planeswalker', 0.95, 'Planeswalker cards', true),
('cheap planeswalkers', 't:planeswalker usd<5', 0.95, 'Budget planeswalkers', true),

-- Format staples
('commander staples', 'f:commander usd<10', 0.85, 'Budget Commander cards', true),
('modern staples', 'f:modern', 0.80, 'Modern legal cards', true),

-- Color identity searches
('mono red', 'id=r', 0.95, 'Red identity only', true),
('mono blue', 'id=u', 0.95, 'Blue identity only', true),
('mono green', 'id=g', 0.95, 'Green identity only', true),
('mono black', 'id=b', 0.95, 'Black identity only', true),
('mono white', 'id=w', 0.95, 'White identity only', true),

-- Guild searches
('rakdos cards', 'id=br', 0.95, 'Rakdos color identity', true),
('simic cards', 'id=ug', 0.95, 'Simic color identity', true),
('gruul cards', 'id=rg', 0.95, 'Gruul color identity', true),
('orzhov cards', 'id=wb', 0.95, 'Orzhov color identity', true),
('azorius cards', 'id=wu', 0.95, 'Azorius color identity', true),
('dimir cards', 'id=ub', 0.95, 'Dimir color identity', true),
('golgari cards', 'id=bg', 0.95, 'Golgari color identity', true),
('boros cards', 'id=rw', 0.95, 'Boros color identity', true),
('selesnya cards', 'id=gw', 0.95, 'Selesnya color identity', true),
('izzet cards', 'id=ur', 0.95, 'Izzet color identity', true)

ON CONFLICT (pattern) DO UPDATE SET
  scryfall_syntax = EXCLUDED.scryfall_syntax,
  confidence = EXCLUDED.confidence,
  description = EXCLUDED.description,
  is_active = true;