# supabase\functions\semantic-search\pipeline\types.ts

- IntentMode · type · L6-L10 — type IntentMode = | 'find_cards' | 'find_card_by_name' | 'rules_question' | 'deck_help';
- CardFunction · type · L12-L31 — type CardFunction = | 'ramp' | 'removal' | 'counterspell' | 'draw' | 'tutor' | 'wipe' | 'reanimation' | 'recursion' | 'blink' | 'stax' | 'tokens' | 'sacrifice' | 'graveyard' | 'artifacts_matter' | 'enchantress' | 'lifegain' | 'mill' | 'wheel' | 'voltron';
- ClassifiedIntent · interface · L33-L38 — interface ClassifiedIntent
- ExtractedSlots · interface · L40-L64 — interface ExtractedSlots
- ConceptMatch · interface · L66-L78 — interface ConceptMatch
- AssembledQuery · interface · L80-L85 — interface AssembledQuery
- ValidationResult · interface · L87-L95 — interface ValidationResult
- RepairResult · interface · L97-L103 — interface RepairResult
- BroadenResult · interface · L105-L110 — interface BroadenResult
- PipelineResult · interface · L112-L135 — interface PipelineResult
- PipelineOptions · interface · L137-L147 — interface PipelineOptions
- PipelineContext · interface · L149-L158 — interface PipelineContext
