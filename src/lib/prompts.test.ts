import { describe, expect, it } from 'vitest';
import type { Item } from '@/types';
import { buildGeneratePrompt, compactCandidate } from './prompts';

/** The candidate array out of a built prompt, as the model will read it. */
function candidateBlock(prompt: string): string {
  const head = prompt.indexOf('CANDIDATES (');
  const start = prompt.indexOf('[', head);
  const end = prompt.indexOf('\n]', start) + 2;
  return prompt.slice(start, end);
}

function item(i: number, extra: Partial<Item> = {}): Item {
  return {
    id: `id-${i}`,
    name: `Navy Oxford Shirt ${i}`,
    primary_color: 'navy',
    secondary_colors: [],
    fit: 'regular',
    sleeve_length: 'long',
    can_be_worn_open: false,
    formality: 3,
    vibe: ['smart', 'clean'],
    occasions: [],
    notes: null,
    category: { id: 'cat-shirt', name: 'Shirt', layer_type: 'mid' },
    ...extra,
  } as unknown as Item;
}

describe('compactCandidate', () => {
  it('drops empty and false fields and keeps real values', () => {
    expect(compactCandidate({ id: 'a', open: false, sleeve: null, vibe: [], note: '', formality: 3, fit: 'regular' }))
      .toBe('{"id":"a","formality":3,"fit":"regular"}');
  });

  it('keeps open when it is true, because the stylist layers on it', () => {
    expect(compactCandidate({ id: 'b', open: true })).toBe('{"id":"b","open":true}');
  });
});

describe('buildGeneratePrompt', () => {
  const context = { temp_c: 22, season: 'autumn', environment: 'outdoor', mode: 'quick', city: 'New Delhi' } as const;

  it('puts each candidate on one line and every id survives the round trip', () => {
    const items = [item(0, { can_be_worn_open: true }), item(1), item(2)];
    const block = candidateBlock(buildGeneratePrompt({ blueprint: 'B', context, candidates: items }));
    const lines = block.split('\n');
    expect(lines).toHaveLength(items.length + 2); // "[", one line per piece, "]"
    const parsed = JSON.parse(block) as Array<Record<string, unknown>>;
    expect(parsed.map((p) => p.id)).toEqual(['id-0', 'id-1', 'id-2']);
    expect(parsed[0].open).toBe(true);
    expect('open' in parsed[1]).toBe(false);
  });

  it('has no pretty-print indentation anywhere in the data', () => {
    const prompt = buildGeneratePrompt({ blueprint: 'B', context, candidates: [item(0), item(1)] });
    // Two-space JSON indentation was what pushed the real prompt past Groq's caps.
    expect(prompt).not.toMatch(/\n {2}"/);
  });

  it('keeps a 46-piece shortlist well under the old pretty-printed size', () => {
    const items = Array.from({ length: 46 }, (_, i) => item(i));
    const prompt = buildGeneratePrompt({ blueprint: '', context, candidates: items });
    const pretty = JSON.stringify(items.map((c) => ({
      id: c.id, name: c.name, layer: c.category?.layer_type, cat: c.category?.name, color: c.primary_color,
      fit: c.fit, sleeve: c.sleeve_length, open: false, formality: c.formality, vibe: c.vibe,
    })), null, 2);
    expect(candidateBlock(prompt).length).toBeLessThan(pretty.length * 0.75);
  });
});
