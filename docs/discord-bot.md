# Discord bot (internal)

The `/offmeta` slash command runs through the `discord-bot` edge function. It is
the only publicly reachable part of the integration, and it is unusable without
Discord's signature: every interaction is verified with Ed25519 against
`DISCORD_PUBLIC_KEY` and rejected with 401 otherwise.

The bot never calls a public OffMeta endpoint. It invokes `semantic-search`
server-to-server with the service-role key, then queries Scryfall directly. The
semantic data API (`offmeta-api`) stays closed — see "API access" below.

## Setup

1. Discord Developer Portal → New Application.
2. Copy **Public Key** (General Information) and store it as the
   `DISCORD_PUBLIC_KEY` secret.
3. Set **Interactions Endpoint URL** to the deployed `discord-bot` function URL.
   Discord sends a PING on save; the function answers with PONG.
4. Register the command with the function's own protected endpoint (no manual
   curl to Discord needed):

   ```
   POST <FUNCTION_URL>?register=1
   x-offmeta-key: <OFFMETA_PIPELINE_KEY>
   ```

   It performs the `PUT /applications/<APP_ID>/commands` call using
   `DISCORD_BOT_TOKEN` and `DISCORD_APPLICATION_ID`.

5. Invite the app with the `applications.commands` scope.

## Health check

`GET <FUNCTION_URL>?health=1` reports the startup check that also runs on every
cold start: `DISCORD_PUBLIC_KEY` presence, key format, and a live Ed25519
verification against a synthetic payload. If interaction verification is
failing in Discord, check this first — it distinguishes a missing/malformed key
from a wrong endpoint URL.

## Response shape

The command defers immediately (Discord's 3s limit) and then edits the message
with one embed containing:

- the original question and the interpreted Scryfall query,
- up to 5 cards, each with condensed oracle text (reminder text stripped,
  clipped to ~180 chars), power/toughness or loyalty, USD price, and EDHREC
  rank,
- a "View all N results on offmeta.app" markdown link in the description
  (Discord footers cannot hold links; the footer is plain branding),
- a footer showing the current result range, e.g. `1–5 of 142`.

Card titles link to `offmeta.app/cards/<slug>`.

### Pagination

Result embeds carry an action row: `◀ Prev`, a disabled `Page X / Y` label, and
`Next ▶`. Clicking a button sends a `MESSAGE_COMPONENT` interaction, which the
function acks with `DEFERRED_UPDATE_MESSAGE` and then edits the same message in
place.

- Page size is 5 cards; browsing is capped at `MAX_BROWSABLE_CARDS = 500` so the
  buttons never walk an unbounded result set.
- Paging reuses the already-translated Scryfall query pulled from the existing
  embed, so it never pays the translation cost again — it only fetches the
  needed Scryfall slice (Scryfall pages are fixed at 175 cards; `scryfallPageFor`
  maps an absolute offset onto a page plus in-page index).
- Edge buttons are disabled, so a click can never request a page that does not
  exist.
- Button clicks count against the same per-user rate limit as searches.

### `cards like X`

"Cards like <name>" does not go through the generic translator (it decomposes
the card name into noisy oracle fragments). It is routed to the card-similarity
engine, which derives *functional* tags from oracle text (e.g. Hermit Druid →
`otag:self-mill`) and searches on what the card does rather than its colour and
mana value. Legacy heuristics are used only when the functional query returns
too few results.

## Rate limiting

A sliding window allows 5 searches per minute per Discord user. Exceeding it
returns an ephemeral message. Pagination clicks are counted in the same window.

## Links and click tracking

Result links point at `https://offmeta.app/go?...`, never at the Supabase
function URL. The payload (`q`, actor hash, guild, expiry, signature) is signed
with HMAC-SHA256 and expires after 7 days.

`src/pages/GoRedirect.tsx` is the client-side bridge: it posts the params back
to the `discord-bot` GET handler, which verifies the signature, records a
`discord_click` analytics event (with `outcome` and `durationMs`), and returns
the real destination. Invalid signatures produce a 400-style message and expired
links a 410-style message, both with a path back to OffMeta. Clicks are
deduplicated in memory for 30s per actor.

Analytics: searches and clicks land in `public.analytics_events` with a
pseudonymised Discord user id, the query, outcome, and card count.

## API access

`offmeta-api` is private. Requests must carry `x-offmeta-key` (or
`Authorization: Bearer <key>`) matching the `OFFMETA_API_KEY` secret; anything
else gets a bare 404 so the surface is not discoverable. The `/api` documentation page and its
sitemap entry were removed — do not re-publish endpoint documentation until we decide to open the data layer.
