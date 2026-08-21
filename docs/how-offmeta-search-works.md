# How OffMeta Search Works

OffMeta is an interpreter between a person and Scryfall.

A user writes:

> Cheap green creatures that make treasure when they enter

OffMeta turns that intent into Scryfall syntax, such as:

```text
c:g t:creature mv<=3 o:"treasure"
```

Scryfall then returns the actual cards.

## The LLM Is Not the Search Engine

The language model does not browse the card database, rank every card, or render the results. Its primary job is translating unusual natural-language intent into a Scryfall query.

Most common searches avoid the LLM entirely. That keeps them faster, more predictable, and less expensive.

## Request Flow

### 1. The browser collects the query

The main search experience starts in [`useSearchQuery.ts`](https://github.com/vermosi/offmeta/blob/main/src/hooks/useSearchQuery.ts).

The browser normalizes the input, handles the search state, and sends the request to the semantic-search edge function.

### 2. The edge function receives it

The backend entry point is [`semantic-search/index.ts`](https://github.com/vermosi/offmeta/blob/main/supabase/functions/semantic-search/index.ts).

It coordinates the translation stages, budgets, caching, validation, logging, and response formatting.

### 3. Deterministic parsing runs first

The parser recognizes common MTG language without using AI:

- colors such as `green` or `mono black`
- card types such as `creatures`, `artifacts`, and `lands`
- formats such as `Commander` and `Modern`
- mana-value constraints such as `under 3 mana`
- print treatments such as `retro frame` and `borderless`
- strategies such as `ramp`, `removal`, and `board wipes`
- Scryfall syntax the user already entered

This logic is mainly in [`deterministic/index.ts`](https://github.com/vermosi/offmeta/blob/main/supabase/functions/semantic-search/deterministic/index.ts).

For an obvious query, this stage produces the Scryfall query directly. No model call is needed.

### 4. Concept matching may run

Broader game concepts such as ramp, card draw, sacrifice, or removal can resolve through curated concept and ontology data. This gives the application a stable vocabulary for common MTG intent instead of asking the model to invent syntax every time.

### 5. Cache and saved rules are checked

Previously successful translations may be served from cache. High-confidence translations can also become reusable translation rules, allowing a query that once needed AI to resolve quickly later.

### 6. Non-English queries may be translated first

The deterministic vocabulary is strongest in English. When the system detects another language, it may first ask the model to translate the search into English while preserving MTG meaning.

For example:

> cartas verdes baratas que roban una carta

may become:

> cheap green cards that draw a card

The normal search pipeline then continues from the English interpretation.

### 7. The main AI translation handles ambiguity

The model is used when a query is novel, complex, or ambiguous. The prompt gives it:

- the user’s query
- valid Scryfall operators
- MTG terminology
- syntax restrictions
- a structured response format
- relevant card context when a specific card is involved

The prompt definitions are in [`prompts.ts`](https://github.com/vermosi/offmeta/blob/main/supabase/functions/semantic-search/prompts.ts).

The model proposes a Scryfall query and returns explanation and confidence metadata.

### 8. The model output is validated

OffMeta does not blindly execute model output. It checks:

- response shape
- query length
- allowed Scryfall keys
- balanced quotes and parentheses
- valid oracle tags
- prompt-injection patterns
- duplicate clauses
- malformed operators
- overly broad or suspicious syntax

The main validation logic is in [`validation.ts`](https://github.com/vermosi/offmeta/blob/main/supabase/functions/semantic-search/validation.ts).

### 9. Known mistakes are repaired

The validator can automatically:

- remove duplicate filters
- normalize tag syntax
- simplify outdated oracle wording
- remove empty operators
- fix certain malformed groups
- strip untranslated words that would accidentally become card-name filters

This means the model proposes an interpretation, but application code decides whether that interpretation is safe and usable.

### 10. Scryfall performs the actual search

Once the query passes validation, Scryfall is the source of truth for cards and card metadata. OffMeta renders those results and shows the interpreted query so users can inspect or edit it.

## What Happens When AI Fails?

The system has several fallback layers:

- deterministic query building
- client-side fallback query building
- cached translations
- card-name lookup
- simplified Scryfall queries
- budget fallbacks when a request is running out of time
- graceful error responses

A slow or unavailable model should degrade the translation quality or complexity, not leave the user with a blank page.

## How the System Improves

Searches and outcomes are logged with information such as:

- original query
- translated query
- translation source: deterministic, concept, AI, fallback, or cache
- confidence
- response time
- whether useful results were returned

Low-confidence or failed searches can enter the repair loop. The nightly regression process replays difficult queries, checks whether they still work, and sends failures to the self-healing system.

Successful repairs can become deterministic translation rules. Over time, repeated queries can move from the slower AI path to a faster rule or cache path.

## Practical Implementation Contract

A similar implementation can keep the boundary simple:

```json
{
  "query": "cheap green creatures that make treasure",
  "locale": "en",
  "useCache": true
}
```

The translation service returns a normalized result shaped roughly like:

```json
{
  "originalQuery": "cheap green creatures that make treasure",
  "scryfallQuery": "c:g t:creature mv<=3 o:\"treasure\"",
  "explanation": {
    "readable": "Green creatures costing three or less that mention treasure",
    "assumptions": [],
    "confidence": 0.91
  },
  "success": true,
  "source": "deterministic",
  "responseTimeMs": 42
}
```

The service should treat `source`, `confidence`, and `responseTimeMs` as observability fields, not as permission to skip validation. A response is only usable after syntax validation and, where needed, Scryfall validation.

In the current implementation, the AI call is bounded by request and stage budgets. The short AI timeout is intentional: if the model is too slow, the request falls back to a deterministic or simplified query rather than waiting indefinitely. The model configuration and timeout constants are in [`config.ts`](https://github.com/vermosi/offmeta/blob/main/supabase/functions/semantic-search/config.ts).

For a production implementation, keep these responsibilities separate:

1. The browser owns input, loading states, and result presentation.
2. The translation service owns model calls, secrets, caching, and validation.
3. The card API owns card data and final search results.
4. Telemetry owns confidence, latency, failures, and repair candidates.

That separation makes it possible to replace the model without rewriting the search UI or the card-data layer.

## The Short Version

```text
User language
    ↓
Deterministic MTG parser
    ↓
Concept, rule, and cache lookup
    ↓
LLM only for ambiguity or novelty
    ↓
Strict validation and repair
    ↓
Scryfall
    ↓
Cards, explanation, and telemetry
```

The LLM is the flexible translator. Deterministic rules, validators, Scryfall, caching, and telemetry provide the guardrails and the actual search behavior.

## Tokenization and Weighting

OffMeta does tokenize and classify the query, but it does not currently assign learned numeric importance to every word.

The parser breaks a query into intent-bearing parts such as:

- colors
- card types and subtypes
- mana and price constraints
- formats
- oracle concepts
- print treatments
- possible card names
- leftover words

The parsing order matters. More specific patterns are handled before broader ones. For example, `retro frame cards` is recognized as a print-treatment query before `retro` or `frame` can be mistaken for card-name terms.

Concept matching can also use word coverage to decide whether a concept applies. This is closer to rule-based matching and coverage scoring than to a learned token-weight model.

There is no exposed weighting such as:

```text
treasure = 0.92 importance
cheap = 0.61 importance
```

The LLM may internally attend to words differently, but that attention is not exposed or used directly by the application. Final query behavior comes from parser precedence, concept matches, confidence, validation, and Scryfall’s query semantics.

Relevant implementation files:

- [`deterministic/index.ts`](https://github.com/vermosi/offmeta/blob/main/supabase/functions/semantic-search/deterministic/index.ts)
- [`parse-patterns.ts`](https://github.com/vermosi/offmeta/blob/main/supabase/functions/semantic-search/deterministic/parse-patterns.ts)
- [`concept-stage.ts`](https://github.com/vermosi/offmeta/blob/main/supabase/functions/semantic-search/concept-stage.ts)
- [`validation.ts`](https://github.com/vermosi/offmeta/blob/main/supabase/functions/semantic-search/validation.ts)
