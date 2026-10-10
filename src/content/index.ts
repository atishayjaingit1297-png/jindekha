import raw from './generated/decks.json';
import { validateDecks } from '../core';
import type { Card, Deck } from '../core';

const result = validateDecks(raw);
if (result.errors.length && import.meta.env.DEV) console.warn(result.errors);

export const DECKS: Deck[] = result.decks;
export const ALL_CARDS: Card[] = DECKS.flatMap((d) => d.cards);
export const CARD_BY_ID: ReadonlyMap<string, Card> = new Map(ALL_CARDS.map((c) => [c.id, c]));
export const KNOWN_CARD_IDS: ReadonlySet<string> = new Set(CARD_BY_ID.keys());
export const CONTENT_ERRORS = result.errors;

export function deckTitle(id: string): string {
  return DECKS.find((d) => d.id === id)?.title ?? id;
}
