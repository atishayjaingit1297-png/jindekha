import { describe, expect, it } from 'vitest';
import {
  canSkip,
  createGame,
  DEFAULT_RULES,
  GameConfigError,
  getLeaders,
  getScores,
  getStandings,
  reduce,
  remainingMs,
} from '../../src/core';
import { act, makeCards, newGame, run, T0 } from './fixtures';

const SEC = 1000;

describe('createGame', () => {
  it('builds a shuffled pile of every selected card, each exactly once', () => {
    const cards = [...makeCards(10, 'a'), ...makeCards(5, 'b')];
    const g = createGame({ teams: [{ name: 'A', color: '#1' }, { name: 'B', color: '#2' }], deckIds: ['a'], rules: DEFAULT_RULES }, cards, 7, T0);
    expect(g.drawPile).toHaveLength(10);
    expect(new Set(g.drawPile).size).toBe(10);
    expect(g.drawPile.every((id) => id.startsWith('a-'))).toBe(true);
    expect(g.status).toBe('ready');
  });

  it('is deterministic for a seed and differs across seeds', () => {
    const cards = makeCards(20);
    const cfg = { teams: [{ name: 'A', color: '#1' }, { name: 'B', color: '#2' }], deckIds: ['d1'], rules: DEFAULT_RULES };
    expect(createGame(cfg, cards, 1, T0).drawPile).toEqual(createGame(cfg, cards, 1, T0).drawPile);
    expect(createGame(cfg, cards, 1, T0).drawPile).not.toEqual(createGame(cfg, cards, 2, T0).drawPile);
  });

  it('rejects invalid configs', () => {
    const cards = makeCards(3);
    const ok = { name: 'A', color: '#1' };
    expect(() => createGame({ teams: [ok], deckIds: ['d1'], rules: DEFAULT_RULES }, cards, 1, T0)).toThrow(GameConfigError);
    expect(() => createGame({ teams: [ok, { name: ' A ', color: '#2' }], deckIds: ['d1'], rules: DEFAULT_RULES }, cards, 1, T0)).toThrow(/unique/);
    expect(() => createGame({ teams: [ok, { name: '', color: '#2' }], deckIds: ['d1'], rules: DEFAULT_RULES }, cards, 1, T0)).toThrow(/name/);
    expect(() => createGame({ teams: [ok, { name: 'B', color: '#2' }], deckIds: ['zz'], rules: DEFAULT_RULES }, cards, 1, T0)).toThrow(/deck/);
  });
});

describe('turn flow and scoring', () => {
  it('scores correct guesses, skips and violations by the rules', () => {
    let g = newGame({ rules: { skipPenalty: 1, violationPenalty: 2 } });
    g = reduce(g, { type: 'START_TURN', now: T0 });
    g = act(g, 'CORRECT', T0 + 1 * SEC);
    g = act(g, 'CORRECT', T0 + 2 * SEC);
    g = act(g, 'SKIP', T0 + 3 * SEC);
    g = act(g, 'VIOLATION', T0 + 4 * SEC);
    expect(getScores(g)).toEqual({ team1: 2 - 1 - 2, team2: 0 });
  });

  it('awards violation points to opponents when configured', () => {
    let g = newGame({ teams: 3, rules: { violationPenalty: 1, violationRecipient: 'opponents' } });
    g = run(g, { type: 'START_TURN', now: T0 });
    g = act(g, 'VIOLATION', T0 + SEC);
    expect(getScores(g)).toEqual({ team1: -1, team2: 1, team3: 1 });
  });

  it('ignores a duplicate tap on a card that was already scored', () => {
    let g = run(newGame(), { type: 'START_TURN', now: T0 });
    const first = g.turn!.currentCardId!;
    g = reduce(g, { type: 'CORRECT', cardId: first, now: T0 + SEC });
    const after = reduce(g, { type: 'CORRECT', cardId: first, now: T0 + SEC + 5 });
    expect(after).toBe(g);
    expect(getScores(after).team1).toBe(1);
  });

  it('rejects card actions outside an active turn', () => {
    const g = newGame();
    const id = g.drawPile[0];
    expect(reduce(g, { type: 'CORRECT', cardId: id, now: T0 })).toBe(g);
  });

  it('never shows the same card twice in a game', () => {
    let g = newGame({ cards: makeCards(40), rules: { endCondition: { type: 'rounds', rounds: 5 } } });
    const seen: string[] = [];
    let now = T0;
    while (g.status !== 'completed') {
      if (g.status === 'ready') g = reduce(g, { type: 'START_TURN', now });
      while (g.status === 'active') {
        seen.push(g.turn!.currentCardId!);
        now += SEC;
        g = act(g, seen.length % 3 === 0 ? 'SKIP' : 'CORRECT', now);
        if (seen.length % 4 === 0) g = reduce(g, { type: 'TICK', now: now + 61 * SEC });
      }
      now += 100 * SEC;
      if (g.status === 'review') g = reduce(g, { type: 'CONFIRM_TURN', now });
      if (g.status === 'round_summary') g = reduce(g, { type: 'NEXT_ROUND', now });
    }
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('limits skips per turn when configured', () => {
    let g = run(newGame({ rules: { maxSkipsPerTurn: 1 } }), { type: 'START_TURN', now: T0 });
    g = act(g, 'SKIP', T0 + SEC);
    expect(canSkip(g)).toBe(false);
    const blocked = act(g, 'SKIP', T0 + 2 * SEC);
    expect(blocked).toBe(g);
  });
});

describe('timer', () => {
  it('computes remaining time from the deadline, not from ticks', () => {
    const g = run(newGame({ rules: { turnSeconds: 60 } }), { type: 'START_TURN', now: T0 });
    expect(remainingMs(g, T0)).toBe(60_000);
    expect(remainingMs(g, T0 + 12_345)).toBe(47_655);
    expect(remainingMs(g, T0 + 999_999)).toBe(0);
  });

  it('expires exactly once and records the unresolved card as a timeout', () => {
    let g = run(newGame({ rules: { turnSeconds: 30 } }), { type: 'START_TURN', now: T0 });
    g = act(g, 'CORRECT', T0 + SEC);
    const onScreen = g.turn!.currentCardId;
    expect(reduce(g, { type: 'TICK', now: T0 + 29_999 })).toBe(g);
    g = reduce(g, { type: 'TICK', now: T0 + 30_000 });
    expect(g.status).toBe('review');
    expect(g.turn!.results.at(-1)).toMatchObject({ cardId: onScreen, outcome: 'timeout' });
    expect(reduce(g, { type: 'TICK', now: T0 + 40_000 })).toBe(g);
    expect(g.turn!.results).toHaveLength(2);
  });

  it('does not score a tap that lands after the deadline', () => {
    let g = run(newGame({ rules: { turnSeconds: 30 } }), { type: 'START_TURN', now: T0 });
    g = act(g, 'CORRECT', T0 + 31_000);
    expect(g.status).toBe('review');
    expect(getScores(g).team1).toBe(0);
  });

  it('pause freezes the clock and resume continues from the same point', () => {
    let g = run(newGame({ rules: { turnSeconds: 60 } }), { type: 'START_TURN', now: T0 }, { type: 'PAUSE', now: T0 + 20_000 });
    expect(g.status).toBe('paused');
    expect(remainingMs(g, T0 + 500_000)).toBe(40_000);
    // card actions are not accepted while paused
    expect(act(g, 'CORRECT', T0 + 21_000)).toBe(g);
    g = reduce(g, { type: 'RESUME', now: T0 + 500_000 });
    expect(remainingMs(g, T0 + 510_000)).toBe(30_000);
    g = reduce(g, { type: 'TICK', now: T0 + 540_000 });
    expect(g.status).toBe('review');
  });

  it('pausing after the deadline expires the turn instead', () => {
    const g = run(newGame({ rules: { turnSeconds: 30 } }), { type: 'START_TURN', now: T0 }, { type: 'PAUSE', now: T0 + 45_000 });
    expect(g.status).toBe('review');
  });
});

describe('review, rotation and rounds', () => {
  it('lets players correct a result before confirming, and recomputes the score', () => {
    let g = run(newGame(), { type: 'START_TURN', now: T0 });
    g = act(g, 'SKIP', T0 + SEC);
    g = reduce(g, { type: 'TICK', now: T0 + 61 * SEC });
    expect(getScores(g).team1).toBe(0);
    g = reduce(g, { type: 'EDIT_RESULT', index: 0, outcome: 'correct' });
    expect(getScores(g).team1).toBe(1);
    expect(reduce(g, { type: 'EDIT_RESULT', index: 9, outcome: 'correct' })).toBe(g);
    g = reduce(g, { type: 'CONFIRM_TURN', now: T0 + 70 * SEC });
    expect(getScores(g).team1).toBe(1);
    expect(reduce(g, { type: 'EDIT_RESULT', index: 0, outcome: 'skip' })).toBe(g);
  });

  it('does not let review edits exceed the skip limit', () => {
    let g = run(newGame({ rules: { maxSkipsPerTurn: 1 } }), { type: 'START_TURN', now: T0 });
    g = act(g, 'SKIP', T0 + 1);
    g = act(g, 'CORRECT', T0 + 2);
    g = reduce(g, { type: 'TICK', now: T0 + 61 * SEC });
    expect(reduce(g, { type: 'EDIT_RESULT', index: 1, outcome: 'skip' })).toBe(g);
    g = reduce(g, { type: 'EDIT_RESULT', index: 0, outcome: 'correct' });
    expect(reduce(g, { type: 'EDIT_RESULT', index: 1, outcome: 'skip' }).turn!.results[1].outcome).toBe('skip');
  });

  it('rotates teams each turn and describers within a team each time it plays', () => {
    let g = newGame({ players: [['अ', 'आ'], ['इ']], rules: { endCondition: { type: 'rounds', rounds: 3 } } });
    const describers: (string | null)[] = [];
    const teams: string[] = [];
    let now = T0;
    for (let i = 0; i < 6; i++) {
      g = reduce(g, { type: 'START_TURN', now });
      teams.push(g.turn!.teamId);
      describers.push(g.turn!.describer);
      g = reduce(g, { type: 'TICK', now: (now += 61 * SEC) });
      g = reduce(g, { type: 'CONFIRM_TURN', now });
      if (g.status === 'round_summary') g = reduce(g, { type: 'NEXT_ROUND', now });
    }
    expect(teams).toEqual(['team1', 'team2', 'team1', 'team2', 'team1', 'team2']);
    expect(describers).toEqual(['अ', 'इ', 'आ', 'इ', 'अ', 'इ']);
    expect(g.status).toBe('completed');
    expect(g.endReason).toBe('rounds');
  });

  it('shows a round summary between rounds', () => {
    let g = newGame({ rules: { endCondition: { type: 'rounds', rounds: 2 } } });
    for (let i = 0; i < 2; i++) {
      g = run(g, { type: 'START_TURN', now: T0 }, { type: 'TICK', now: T0 + 61 * SEC }, { type: 'CONFIRM_TURN', now: T0 + 62 * SEC });
    }
    expect(g.status).toBe('round_summary');
    expect(g.round).toBe(1);
    g = reduce(g, { type: 'NEXT_ROUND', now: T0 });
    expect(g).toMatchObject({ status: 'ready', round: 2, teamIndex: 0 });
  });

  it('ends a score-target game only at the end of a round so every team gets equal turns', () => {
    let g = newGame({ rules: { endCondition: { type: 'score', target: 5 } } });
    g = run(g, { type: 'START_TURN', now: T0 });
    for (let i = 1; i <= 5; i++) g = act(g, 'CORRECT', T0 + i);
    g = run(g, { type: 'TICK', now: T0 + 61 * SEC }, { type: 'CONFIRM_TURN', now: T0 + 62 * SEC });
    expect(g.status).toBe('ready');
    g = run(g, { type: 'START_TURN', now: T0 + 70 * SEC }, { type: 'TICK', now: T0 + 140 * SEC }, { type: 'CONFIRM_TURN', now: T0 + 141 * SEC });
    expect(g.status).toBe('completed');
    expect(g.endReason).toBe('score');
    expect(getLeaders(g).map((t) => t.id)).toEqual(['team1']);
  });

  it('reports ties with shared rank', () => {
    let g = newGame({ teams: 3, rules: { endCondition: { type: 'rounds', rounds: 1 } } });
    for (let i = 0; i < 3; i++) {
      g = reduce(g, { type: 'START_TURN', now: T0 });
      if (i < 2) g = act(g, 'CORRECT', T0 + 1);
      g = run(g, { type: 'TICK', now: T0 + 61 * SEC }, { type: 'CONFIRM_TURN', now: T0 + 62 * SEC });
    }
    expect(g.status).toBe('completed');
    expect(getLeaders(g)).toHaveLength(2);
    expect(getStandings(g).map((s) => s.rank)).toEqual([1, 1, 3]);
  });

  it('ends the game when the deck runs out', () => {
    let g = newGame({ cards: makeCards(3), rules: { endCondition: { type: 'rounds', rounds: 9 } } });
    g = reduce(g, { type: 'START_TURN', now: T0 });
    g = act(g, 'CORRECT', T0 + 1);
    g = act(g, 'CORRECT', T0 + 2);
    g = act(g, 'CORRECT', T0 + 3);
    expect(g.status).toBe('review');
    expect(g.turn!.endedBy).toBe('deck');
    g = reduce(g, { type: 'CONFIRM_TURN', now: T0 + 4 });
    expect(g).toMatchObject({ status: 'completed', endReason: 'deck_exhausted' });
    expect(getScores(g).team1).toBe(3);
  });

  it('returns skipped cards to the pile at turn end when recycling is on', () => {
    let g = newGame({ cards: makeCards(5), rules: { recycleSkipped: true } });
    g = reduce(g, { type: 'START_TURN', now: T0 });
    const skipped = g.turn!.currentCardId!;
    g = act(g, 'SKIP', T0 + 1);
    expect(g.drawPile).not.toContain(skipped);
    g = run(g, { type: 'TICK', now: T0 + 61 * SEC }, { type: 'CONFIRM_TURN', now: T0 + 62 * SEC });
    expect(g.drawPile.at(-1)).toBe(skipped);
  });

  it('END_GAME keeps the results already played', () => {
    let g = run(newGame(), { type: 'START_TURN', now: T0 });
    g = act(g, 'CORRECT', T0 + 1);
    g = reduce(g, { type: 'END_GAME', now: T0 + 2 });
    expect(g.status).toBe('completed');
    expect(getScores(g).team1).toBe(1);
    expect(reduce(g, { type: 'START_TURN', now: T0 + 3 })).toBe(g);
  });
});
