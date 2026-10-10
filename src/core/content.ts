import type { Card, Deck } from './types';

/** Runtime validation of deck data (the build script validates too; this protects against bad imports). */
export function validateDecks(input: unknown): { decks: Deck[]; errors: string[] } {
  const errors: string[] = [];
  const decks: Deck[] = [];
  const seen = new Set<string>();
  const root = input as { schemaVersion?: unknown; decks?: unknown };
  if (!root || root.schemaVersion !== 1 || !Array.isArray(root.decks)) {
    return { decks: [], errors: ['content: unsupported or missing schemaVersion'] };
  }
  for (const d of root.decks as Record<string, unknown>[]) {
    if (typeof d?.id !== 'string' || typeof d.title !== 'string' || !Array.isArray(d.cards)) {
      errors.push('content: malformed deck');
      continue;
    }
    const cards: Card[] = [];
    for (const c of d.cards as Record<string, unknown>[]) {
      const ok =
        typeof c?.id === 'string' &&
        c.deckId === d.id &&
        typeof c.target === 'string' &&
        c.target.trim() !== '' &&
        Array.isArray(c.forbidden) &&
        c.forbidden.length > 0 &&
        c.forbidden.every((w) => typeof w === 'string' && w.trim() !== '') &&
        typeof (c.source as { page?: unknown })?.page === 'number';
      if (!ok) {
        errors.push(`content: malformed card in ${d.id}: ${String(c?.id)}`);
        continue;
      }
      if (seen.has(c.id as string)) {
        errors.push(`content: duplicate card id ${String(c.id)}`);
        continue;
      }
      seen.add(c.id as string);
      cards.push(c as unknown as Card);
    }
    decks.push({
      id: d.id,
      title: d.title,
      sourcePdf: typeof d.sourcePdf === 'string' ? d.sourcePdf : '',
      alsoIn: Array.isArray(d.alsoIn) ? (d.alsoIn as string[]) : [],
      cards,
    });
  }
  return { decks, errors };
}
