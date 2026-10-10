import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, pointsFor, reduce, restoreGame, sanitizeRules, validateDecks } from '../../src/core';
import decksJson from '../../src/content/generated/decks.json';
import { act, newGame, run, T0 } from './fixtures';

describe('rules', () => {
  it('repairs out-of-range and missing values', () => {
    const r = sanitizeRules({ turnSeconds: 1, pointsCorrect: -4, endCondition: { type: 'score', target: 9999 } });
    expect(r.turnSeconds).toBe(15);
    expect(r.pointsCorrect).toBe(1);
    expect(r.endCondition).toEqual({ type: 'score', target: 200 });
    expect(sanitizeRules(null)).toEqual(DEFAULT_RULES);
  });

  it('maps outcomes to points in one place', () => {
    const rules = { ...DEFAULT_RULES, pointsCorrect: 2, skipPenalty: 1, violationPenalty: 3, violationRecipient: 'opponents' as const };
    expect(pointsFor('correct', rules)).toEqual({ own: 2, others: 0 });
    expect(pointsFor('skip', rules)).toEqual({ own: -1, others: 0 });
    expect(pointsFor('violation', rules)).toEqual({ own: -3, others: 3 });
    expect(pointsFor('timeout', rules)).toEqual({ own: 0, others: 0 });
  });
});

describe('restoreGame', () => {
  const known = (g: ReturnType<typeof newGame>) => new Set([...g.drawPile, ...(g.turn?.currentCardId ? [g.turn.currentCardId] : [])]);

  it('round-trips through JSON', () => {
    let g = run(newGame(), { type: 'START_TURN', now: T0 });
    g = act(g, 'CORRECT', T0 + 1000);
    g = run(g, { type: 'TICK', now: T0 + 61_000 });
    const all = new Set([...known(g), ...g.turn!.results.map((r) => r.cardId)]);
    const restored = restoreGame(JSON.parse(JSON.stringify(g)), all);
    expect(restored).toEqual(g);
  });

  it('brings a running turn back paused, with the time left at its last save', () => {
    let g = run(newGame({ rules: { turnSeconds: 60 } }), { type: 'START_TURN', now: T0 });
    g = act(g, 'CORRECT', T0 + 15_000); // updatedAt = T0 + 15s
    const all = new Set([...known(g), ...g.turn!.results.map((r) => r.cardId)]);
    const restored = restoreGame(JSON.parse(JSON.stringify(g)), all)!;
    expect(restored.status).toBe('paused');
    expect(restored.turn!.remainingMs).toBe(45_000);
    const resumed = reduce(restored, { type: 'RESUME', now: T0 + 999_000 });
    expect(resumed.status).toBe('active');
  });

  it('rejects corrupted or incompatible data instead of crashing', () => {
    const g = newGame();
    expect(restoreGame(null, new Set())).toBeNull();
    expect(restoreGame('nonsense', new Set())).toBeNull();
    expect(restoreGame({ ...g, schemaVersion: 999 }, known(g))).toBeNull();
    expect(restoreGame({ ...g, teams: [] }, known(g))).toBeNull();
    expect(restoreGame({ ...g, status: 'dancing' }, known(g))).toBeNull();
    expect(restoreGame({ ...g, teamIndex: 7 }, known(g))).toBeNull();
  });

  it('ends a restored turn whose on-screen card was removed from the content', () => {
    const g = run(newGame(), { type: 'START_TURN', now: T0 });
    const all = known(g);
    all.delete(g.turn!.currentCardId!);
    const restored = restoreGame(JSON.parse(JSON.stringify(g)), all)!;
    expect(restored.status).toBe('review');
    expect(restored.turn!.endedBy).toBe('deck');
  });

  it('drops cards that no longer exist in the content', () => {
    const g = newGame();
    const keep = new Set(g.drawPile.slice(0, 5));
    expect(restoreGame(JSON.parse(JSON.stringify(g)), keep)!.drawPile).toHaveLength(5);
  });
});

describe('bundled content', () => {
  const { decks, errors } = validateDecks(decksJson);

  it('passes runtime validation', () => {
    expect(errors).toEqual([]);
    expect(decks.map((d) => d.id)).toEqual(['jt1', 'jt2']);
  });

  it('contains every card extracted from the PDFs, each with a target and forbidden words', () => {
    expect(decks[0].cards).toHaveLength(45);
    expect(decks[1].cards).toHaveLength(49);
    for (const c of decks.flatMap((d) => d.cards)) {
      expect(c.target.length).toBeGreaterThan(0);
      expect(c.forbidden.length).toBe(4);
      expect(c.target.normalize('NFC')).toBe(c.target);
    }
  });

  it('keeps forbidden words attached to their target (spot checks against the PDFs)', () => {
    const byId = new Map(decks.flatMap((d) => d.cards).map((c) => [c.id, c]));
    expect(byId.get('jt1-001')).toMatchObject({ target: 'तत्वार्थ सूत्र', forbidden: ['उमा स्वामी', 'संकृत', '१० अध्याय', 'मोक्ष शास्त्र'] });
    expect(byId.get('jt1-021')).toMatchObject({ target: 'भक्तामर स्तोत्र', forbidden: ['मानतुंग आचार्य', '४८ काव्य', 'आदिनाथ भगवान', 'ताले'] });
    expect(byId.get('jt2-017')).toMatchObject({ target: 'प्रथमानुयोग', forbidden: ['पुराण', 'कहानी', 'चरित्र', 'तीर्थंकर'] });
    expect(byId.get('jt2-049')).toMatchObject({ target: 'क्षायिक', forbidden: ['सम्यक्त्व', 'ज्ञान', 'नाश', 'कर्म'] });
  });

  it('has unique card ids and unique targets', () => {
    const all = decks.flatMap((d) => d.cards);
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
    expect(new Set(all.map((c) => c.target)).size).toBe(all.length);
  });

  it('rejects malformed content', () => {
    expect(validateDecks({}).errors.length).toBeGreaterThan(0);
    const bad = { schemaVersion: 1, decks: [{ id: 'x', title: 'X', cards: [{ id: 'x-1', deckId: 'x', target: '', forbidden: [], source: { page: 1 } }] }] };
    expect(validateDecks(bad).decks[0].cards).toHaveLength(0);
  });
});
