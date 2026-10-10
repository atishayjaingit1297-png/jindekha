import { GAME_SCHEMA_VERSION } from './engine';
import { sanitizeRules } from './rules';
import type { CardResult, GameState, GameStatus, Outcome } from './types';

const STATUSES: GameStatus[] = ['ready', 'active', 'paused', 'review', 'round_summary', 'completed'];
const OUTCOMES: Outcome[] = ['correct', 'skip', 'violation', 'timeout'];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function results(v: unknown, known: Set<string>): CardResult[] | null {
  if (!Array.isArray(v)) return null;
  const out: CardResult[] = [];
  for (const r of v) {
    if (!isObj(r) || !isStr(r.cardId) || !OUTCOMES.includes(r.outcome as Outcome) || !isNum(r.at)) return null;
    // Results for cards that no longer exist in the content are dropped rather than crashing.
    if (known.has(r.cardId)) out.push({ cardId: r.cardId, outcome: r.outcome as Outcome, at: r.at });
  }
  return out;
}

/**
 * Validates persisted data and turns it back into a playable GameState.
 * Returns null for anything corrupted or from an incompatible schema version.
 * A turn that was running when the app closed comes back *paused* with the time it had at its last save.
 */
export function restoreGame(raw: unknown, knownCardIds: Set<string>): GameState | null {
  try {
    if (!isObj(raw) || raw.schemaVersion !== GAME_SCHEMA_VERSION) return null;
    const s = raw as unknown as GameState;
    if (!isStr(s.id) || !isNum(s.createdAt) || !isNum(s.updatedAt) || !isNum(s.seed)) return null;
    if (!STATUSES.includes(s.status)) return null;
    if (!Array.isArray(s.teams) || s.teams.length < 2) return null;
    for (const t of s.teams) {
      if (!isObj(t) || !isStr(t.id) || !isStr(t.name) || !isStr(t.color) || !Array.isArray(t.players)) return null;
    }
    if (!isNum(s.round) || s.round < 1 || !isNum(s.teamIndex) || s.teamIndex < 0 || s.teamIndex >= s.teams.length) return null;
    if (!Array.isArray(s.describerIndex) || s.describerIndex.length !== s.teams.length || !s.describerIndex.every(isNum)) return null;
    if (!Array.isArray(s.drawPile) || !Array.isArray(s.history) || !Array.isArray(s.deckIds)) return null;

    const teamIds = new Set(s.teams.map((t) => t.id));
    const history = [];
    for (const h of s.history) {
      if (!isObj(h) || !isNum(h.number) || !isNum(h.round) || !isStr(h.teamId) || !teamIds.has(h.teamId)) return null;
      const r = results(h.results, knownCardIds);
      if (!r) return null;
      history.push({ number: h.number, round: h.round, teamId: h.teamId, describer: isStr(h.describer) ? h.describer : null, results: r });
    }

    let turn = s.turn;
    let status = s.status;
    if (status === 'active' || status === 'paused' || status === 'review') {
      if (!isObj(turn) || !isStr(turn.teamId) || !teamIds.has(turn.teamId)) return null;
      const r = results(turn.results, knownCardIds);
      if (!r) return null;
      let current = isStr(turn.currentCardId) && knownCardIds.has(turn.currentCardId) ? turn.currentCardId : null;
      let remaining = isNum(turn.remainingMs) ? turn.remainingMs : 0;
      if (status === 'active') {
        remaining = isNum(turn.endsAt) ? Math.max(0, turn.endsAt - s.updatedAt) : 0;
        status = 'paused';
      }
      let endedBy: 'time' | 'deck' | null = turn.endedBy === 'deck' ? 'deck' : turn.endedBy === 'time' ? 'time' : null;
      if (status === 'paused' && current === null) {
        // The card on screen vanished from the content; nothing left to play this turn.
        status = 'review';
        remaining = 0;
        endedBy = 'deck';
      }
      if (status === 'review') current = null;
      turn = {
        number: isNum(turn.number) ? turn.number : history.length + 1,
        teamId: turn.teamId,
        describer: isStr(turn.describer) ? turn.describer : null,
        endsAt: null,
        remainingMs: remaining,
        currentCardId: current,
        results: r,
        endedBy,
      };
    } else {
      turn = null;
    }

    return {
      schemaVersion: GAME_SCHEMA_VERSION,
      id: s.id,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      rules: sanitizeRules(s.rules),
      teams: s.teams.map((t) => ({ id: t.id, name: t.name, color: t.color, players: t.players.filter(isStr) })),
      deckIds: s.deckIds.filter(isStr),
      drawPile: s.drawPile.filter((id): id is string => isStr(id) && knownCardIds.has(id)),
      status,
      round: s.round,
      teamIndex: s.teamIndex,
      describerIndex: s.describerIndex,
      turn,
      history,
      endReason: s.endReason === 'rounds' || s.endReason === 'score' || s.endReason === 'deck_exhausted' ? s.endReason : null,
      seed: s.seed,
    };
  } catch {
    return null;
  }
}
