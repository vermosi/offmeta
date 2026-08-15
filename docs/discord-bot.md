# Discord bot (internal)

The `/offmeta` slash command runs through the `discord-bot` edge function. It is
the only publicly reachable part of the integration, and it is unusable without
Discord's signature: every request is verified with Ed25519 against
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
4. Register the command (bot token required, one-off call):

   ```
   POST https://discord.com/api/v10/applications/<APP_ID>/commands
   Authorization: Bot <BOT_TOKEN>

   {
     "name": "offmeta",
     "description": "Search Magic cards in plain English",
     "options": [
       { "name": "query", "description": "What kind of card are you after?",
         "type": 3, "required": true }
     ]
   }
   ```

5. Invite the app with the `applications.commands` scope.

## Response shape

The command defers immediately (Discord's 3s limit) and then edits the message
with one embed: the original question, the interpreted Scryfall query, up to 5
cards, and a link to the full results on `offmeta.app`.

## API access

`offmeta-api` is private. Requests must carry `x-offmeta-key` (or
`Authorization: Bearer <key>`) matching the `OFFMETA_API_KEY` secret; anything
else gets a bare 404 so the surface is not discoverable. The `/api`
documentation page, its sitemap entry, and `docs/api.md` were removed — do not
re-publish endpoint documentation until we decide to open the data layer.
