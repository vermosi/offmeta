/**
 * Machine-readable schema for the OffMeta semantic API.
 * Kept in its own module so the handler stays readable.
 *
 * @module functions/offmeta-api/openapi
 */

const CARD_PROFILE_SCHEMA = {
  type: 'object',
  properties: {
    oracle_id: { type: 'string' },
    name: { type: 'string' },
    mana_cost: { type: 'string', nullable: true },
    cmc: { type: 'number' },
    type_line: { type: 'string', nullable: true },
    colors: { type: 'array', items: { type: 'string', enum: ['W', 'U', 'B', 'R', 'G'] } },
    rarity: { type: 'string', nullable: true },
    legalities: { type: 'object', additionalProperties: { type: 'string' } },
    image_url: { type: 'string', nullable: true },
    roles: { $ref: '#/components/schemas/ConceptList' },
    methods: { $ref: '#/components/schemas/ConceptList' },
    problems: { $ref: '#/components/schemas/ConceptList' },
    characteristics: { $ref: '#/components/schemas/ConceptList' },
    approaches: {
      type: 'array',
      items: {
        type: 'object',
        properties: { key: { type: 'string' }, label: { type: 'string' } },
      },
    },
  },
} as const;

export function buildOpenApiDocument(origin: string): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'OffMeta Semantic API',
      version: '1.0.0',
      description:
        'Read-only functional metadata for Magic: The Gathering cards. Every card is classified deterministically into roles, methods, problems addressed, characteristics and strategic approaches.',
      contact: { url: 'https://offmeta.app/api' },
      license: { name: 'Card data © Scryfall; semantic layer © OffMeta' },
    },
    servers: [{ url: `${origin}/functions/v1/offmeta-api` }],
    paths: {
      '/v1/concepts': {
        get: {
          summary: 'List every concept in the OffMeta ontology',
          responses: {
            '200': {
              description: 'Concept directory',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      version: { type: 'string' },
                      count: { type: 'integer' },
                      concepts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            tag_key: { type: 'string' },
                            dimension: {
                              type: 'string',
                              enum: ['ROLE', 'METHOD', 'PROBLEM', 'CHARACTERISTIC'],
                            },
                            label: { type: 'string' },
                            description: { type: 'string', nullable: true },
                            card_count: { type: 'integer' },
                            approaches: { type: 'array', items: { type: 'string' } },
                            related: { type: 'array', items: { type: 'string' } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/v1/cards': {
        get: {
          summary: 'Semantic profiles for one or more cards, looked up by exact name',
          parameters: [
            {
              name: 'name',
              in: 'query',
              required: true,
              description: 'Card name. Repeat or comma-separate for up to 50 cards.',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Card profiles plus any names that could not be resolved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      version: { type: 'string' },
                      requested: { type: 'integer' },
                      cards: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/CardProfile' },
                      },
                      unresolved: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
            '400': { description: 'No name supplied' },
          },
        },
      },
      '/v1/search': {
        get: {
          summary: 'Find cards by functional concept rather than card text',
          parameters: [
            {
              name: 'concepts',
              in: 'query',
              required: true,
              description: 'Concept keys from /v1/concepts. Comma-separated, up to 12.',
              schema: { type: 'string' },
            },
            {
              name: 'colors',
              in: 'query',
              description: 'Restrict to cards inside these colors, e.g. `WU` or `G`.',
              schema: { type: 'string' },
            },
            {
              name: 'match',
              in: 'query',
              description: '`any` (default) matches at least one concept, `all` requires every concept.',
              schema: { type: 'string', enum: ['any', 'all'], default: 'any' },
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 200, default: 40 },
            },
          ],
          responses: {
            '200': { description: 'Matching cards ranked by number of concepts matched' },
            '400': { description: 'No concepts supplied' },
          },
        },
      },
    },
    components: {
      schemas: {
        ConceptList: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              description: { type: 'string', nullable: true },
            },
          },
        },
        CardProfile: CARD_PROFILE_SCHEMA,
      },
    },
  };
}
