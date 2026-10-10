import { createGame, DEFAULT_RULES, reduce } from '../../src/core';
import type { Card, GameAction, GameState, Rules } from '../../src/core';

export function makeCards(n: number, deckId = 'd1'): Card[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${deckId}-${String(i + 1).padStart(3, '0')}`,
    deckId,
    target: `शब्द ${i + 1}`,
    forbidden: ['क', 'ख', 'ग', 'घ'],
    source: { pdf: 'fixture.pdf', page: i + 1 },
  }));
}

export const T0 = 1_000_000;

export function newGame(opts: { rules?: Partial<Rules>; cards?: Card[]; teams?: number; players?: string[][] } = {}): GameState {
  const teams = Array.from({ length: opts.teams ?? 2 }, (_, i) => ({
    name: `टीम ${i + 1}`,
    color: '#000',
    players: opts.players?.[i],
  }));
  const cards = opts.cards ?? makeCards(30);
  return createGame(
    { teams, deckIds: [...new Set(cards.map((c) => c.deckId))], rules: { ...DEFAULT_RULES, ...opts.rules } },
    cards,
    42,
    T0,
  );
}

export function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(reduce, state);
}

/** Resolves the card on screen with the given action type. */
export function act(state: GameState, type: 'CORRECT' | 'SKIP' | 'VIOLATION', now: number): GameState {
  return reduce(state, { type, cardId: state.turn!.currentCardId!, now });
}
