/**
 * Client-side decklist parser.
 * Handles common text formats: "1 Sol Ring", "1x Sol Ring", "Sol Ring"
 * Supports Moxfield export: "1 Sol Ring (CMR) 350 *F*"
 * Extracts commander from "COMMANDER:" prefix or "*CMDR*" marker.
 */

/** Result of parsing a raw decklist string. */
export interface ParsedDecklist {
  /** Individual card entries with name and quantity. */
  cards: { name: string; quantity: number }[];
  /** Detected commander name, or null if none found. */
  commander: string | null;
  /** Sum of all card quantities. */
  totalCards: number;
}

const SECTION_HEADERS = /^(\/\/|Sideboard|Maybeboard|Companion|Considering)/i;
const CMDR_PREFIX = /^COMMANDER:\s*(.+)/i;
const CMDR_MARKER = /\*CMDR\*/i;
const FOIL_MARKERS = /\*[A-Z]+\*/gi;
const CARD_LINE = /^(?:(\d+)x?\s+)?(.+?)(?:\s+\([\w]+\)\s+\d+.*)?$/i;

export function parseDecklist(raw: string): ParsedDecklist {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  let commander: string | null = null;
  const cards: { name: string; quantity: number }[] = [];

  for (const line of lines) {
    if (SECTION_HEADERS.test(line)) continue;

    const cmdrMatch = line.match(CMDR_PREFIX);
    if (cmdrMatch) {
      commander = clean(cmdrMatch[1]);
      continue;
    }

    const m = line.match(CARD_LINE);
    if (!m) continue;

    const qty = m[1] ? parseInt(m[1], 10) : 1;
    let name = m[2].trim();
    const isCmdr = CMDR_MARKER.test(name);
    name = clean(name);
    if (!name) continue;

    if (isCmdr) commander = name;
    cards.push({ name, quantity: qty });
  }

  return {
    cards,
    commander,
    totalCards: cards.reduce((sum, c) => sum + c.quantity, 0),
  };
}

function clean(n: string): string {
  return n.replace(FOIL_MARKERS, '').replace(/\s+/g, ' ').trim();
}
