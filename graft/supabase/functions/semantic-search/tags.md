# supabase\functions\semantic-search\tags.ts

- ScryfallTagRecord · type · L1-L4 — type ScryfallTagRecord = { label?: string; aliases?: string[]; };
- TagRegistry · type · L147-L151 — type TagRegistry = { knownOtags: Set<string>; canonicalByAlias: Map<string, string>; source: 'api' | 'fallback'; };
- addTag · function · L155-L170 — function addTag( knownOtags: Set<string>, canonicalByAlias: Map<string, string>, label: string, aliases: string[] | undefined, ): void
- loadRegistryFromApi · function · L172-L220 — async function loadRegistryFromApi(): Promise<TagRegistry>
- loadFallbackRegistry · function · L222-L234 — function loadFallbackRegistry(): TagRegistry
- loadRegistry · function · L236-L250 — async function loadRegistry(): Promise<TagRegistry>
- resolveOtag · function · L256-L259 — function resolveOtag(tag: string): string
- isKnownOtag · function · L261-L263 — function isKnownOtag(tag: string): boolean
- getOtagRegistrySource · function · L265-L267 — function getOtagRegistrySource(): 'api' | 'fallback'
