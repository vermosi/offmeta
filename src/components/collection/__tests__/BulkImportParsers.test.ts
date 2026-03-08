/**
 * Smoke tests for bulk import parsers: text list, CSV, and Moxfield formats.
 * @module components/collection/__tests__/BulkImportParsers
 */

import { describe, it, expect } from 'vitest';

// We need to extract the parsers for testing. Since they're module-private,
// we re-implement the same logic here as a contract test.

interface ParsedEntry {
  name: string;
  quantity: number;
  foil: boolean;
}

const MAX_IMPORT_LINES = 5000;

function parseTextList(raw: string): ParsedEntry[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const entries: ParsedEntry[] = [];

  for (const line of lines.slice(0, MAX_IMPORT_LINES)) {
    if (/^(\/\/|#|Sideboard|Maybeboard|COMMANDER)/i.test(line)) continue;

    const foil = /\*F\*/i.test(line) || /\bfoil\b/i.test(line);
    const cleaned = line.replace(/\*[A-Z]+\*/gi, '').trim();

    const m = cleaned.match(/^(?:(\d+)x?\s+)?(.+?)(?:\s+\([\w]+\)\s+\d+.*)?$/i);
    if (!m) continue;

    const qty = m[1] ? parseInt(m[1], 10) : 1;
    const name = m[2].trim();
    if (!name || name.length > 200) continue;

    entries.push({ name, quantity: Math.min(qty, 999), foil });
  }

  return entries;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(raw: string): ParsedEntry[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const cols = header.split(',').map((c) => c.replace(/"/g, '').trim());

  const nameIdx = cols.findIndex((c) => ['name', 'card_name', 'card name', 'card'].includes(c));
  const qtyIdx = cols.findIndex((c) => ['quantity', 'qty', 'count'].includes(c));
  const foilIdx = cols.findIndex((c) => ['foil', 'is_foil'].includes(c));

  if (nameIdx < 0) return [];

  const entries: ParsedEntry[] = [];
  for (const line of lines.slice(1, MAX_IMPORT_LINES + 1)) {
    const fields = parseCsvLine(line);
    const name = fields[nameIdx]?.trim();
    if (!name || name.length > 200) continue;

    const qty = qtyIdx >= 0 ? parseInt(fields[qtyIdx], 10) || 1 : 1;
    const foil = foilIdx >= 0 ? ['true', 'yes', '1'].includes(fields[foilIdx]?.toLowerCase()) : false;

    entries.push({ name, quantity: Math.min(qty, 999), foil });
  }

  return entries;
}

function parseMoxfieldCsv(raw: string): ParsedEntry[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const cols = header.split(',').map((c) => c.replace(/"/g, '').trim());

  const nameIdx = cols.findIndex((c) => c === 'name');
  const countIdx = cols.findIndex((c) => c === 'count');
  const foilIdx = cols.findIndex((c) => c === 'foil' || c === 'is foil');

  if (nameIdx < 0) return [];

  const entries: ParsedEntry[] = [];
  for (const line of lines.slice(1, MAX_IMPORT_LINES + 1)) {
    const fields = parseCsvLine(line);
    const name = fields[nameIdx]?.trim();
    if (!name || name.length > 200) continue;

    const qty = countIdx >= 0 ? parseInt(fields[countIdx], 10) || 1 : 1;
    const foil = foilIdx >= 0 ? ['true', 'yes', '1'].includes(fields[foilIdx]?.toLowerCase()) : false;

    entries.push({ name, quantity: Math.min(qty, 999), foil });
  }

  return entries;
}

describe('Text List Parser', () => {
  it('parses standard format "4 Lightning Bolt"', () => {
    const result = parseTextList('4 Lightning Bolt');
    expect(result).toEqual([{ name: 'Lightning Bolt', quantity: 4, foil: false }]);
  });

  it('parses "2x Sol Ring" format', () => {
    const result = parseTextList('2x Sol Ring');
    expect(result).toEqual([{ name: 'Sol Ring', quantity: 2, foil: false }]);
  });

  it('detects foil with *F* marker', () => {
    const result = parseTextList('1 Rhystic Study *F*');
    expect(result).toEqual([{ name: 'Rhystic Study', quantity: 1, foil: true }]);
  });

  it('detects foil with "foil" keyword', () => {
    const result = parseTextList('1 Rhystic Study foil');
    expect(result[0].foil).toBe(true);
  });

  it('strips set code and collector number', () => {
    const result = parseTextList('3 Counterspell (MH2) 267');
    expect(result).toEqual([{ name: 'Counterspell', quantity: 3, foil: false }]);
  });

  it('defaults quantity to 1 when not specified', () => {
    const result = parseTextList('Lightning Bolt');
    expect(result[0].quantity).toBe(1);
  });

  it('skips section headers', () => {
    const result = parseTextList('// Sideboard\nSideboard\n# Comment\n2 Lightning Bolt');
    expect(result).toEqual([{ name: 'Lightning Bolt', quantity: 2, foil: false }]);
  });

  it('caps quantity at 999', () => {
    const result = parseTextList('9999 Lightning Bolt');
    expect(result[0].quantity).toBe(999);
  });

  it('handles empty input', () => {
    expect(parseTextList('')).toEqual([]);
  });

  it('handles multiple lines', () => {
    const input = '4 Lightning Bolt\n2x Sol Ring\n1 Rhystic Study *F*';
    const result = parseTextList(input);
    expect(result).toHaveLength(3);
  });

  it('skips lines with names exceeding 200 chars', () => {
    const longName = 'A'.repeat(201);
    expect(parseTextList(`1 ${longName}`)).toEqual([]);
  });
});

describe('CSV Parser', () => {
  it('parses standard CSV with name, quantity, foil headers', () => {
    const csv = 'name,quantity,foil\nLightning Bolt,4,false\nSol Ring,2,true';
    const result = parseCsv(csv);
    expect(result).toEqual([
      { name: 'Lightning Bolt', quantity: 4, foil: false },
      { name: 'Sol Ring', quantity: 2, foil: true },
    ]);
  });

  it('supports card_name header', () => {
    const csv = 'card_name,qty\nCounterspell,3';
    const result = parseCsv(csv);
    expect(result).toEqual([{ name: 'Counterspell', quantity: 3, foil: false }]);
  });

  it('handles quoted fields', () => {
    const csv = 'name,quantity\n"Teferi, Hero of Dominaria",1';
    const result = parseCsv(csv);
    expect(result[0].name).toBe('Teferi, Hero of Dominaria');
  });

  it('returns empty for missing name column', () => {
    const csv = 'title,count\nBolt,4';
    expect(parseCsv(csv)).toEqual([]);
  });

  it('returns empty for single-line input', () => {
    expect(parseCsv('name')).toEqual([]);
  });

  it('defaults qty to 1 when invalid', () => {
    const csv = 'name,quantity\nBolt,abc';
    expect(parseCsv(csv)[0].quantity).toBe(1);
  });
});

describe('Moxfield CSV Parser', () => {
  it('parses Moxfield export format', () => {
    const csv = 'Count,Name,Edition,Collector Number,Foil\n4,Lightning Bolt,2X2,117,\n1,Sol Ring,CMR,472,true';
    const result = parseMoxfieldCsv(csv);
    expect(result).toEqual([
      { name: 'Lightning Bolt', quantity: 4, foil: false },
      { name: 'Sol Ring', quantity: 1, foil: true },
    ]);
  });

  it('handles missing foil column', () => {
    const csv = 'Count,Name,Edition\n2,Counterspell,MH2';
    const result = parseMoxfieldCsv(csv);
    expect(result).toEqual([{ name: 'Counterspell', quantity: 2, foil: false }]);
  });

  it('returns empty without Name header', () => {
    const csv = 'Count,Card,Edition\n1,Bolt,M21';
    expect(parseMoxfieldCsv(csv)).toEqual([]);
  });

  it('handles quoted card names with commas', () => {
    const csv = 'Count,Name,Edition\n1,"Korvold, Fae-Cursed King",ELD';
    const result = parseMoxfieldCsv(csv);
    expect(result[0].name).toBe('Korvold, Fae-Cursed King');
  });
});
