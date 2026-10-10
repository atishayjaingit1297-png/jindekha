import { pointsFor, sanitizeRules } from './rules';
import { createRng, shuffle } from './random';
import type {
  ActiveTurn,
  Card,
  CardResult,
  GameAction,
  GameConfig,
  GameState,
  Outcome,
  Team,
  TurnRecord,
} from './types';

export const GAME_SCHEMA_VERSION = 1;

export class GameConfigError extends Error {}

export function createGame(config: GameConfig, allCards: readonly Card[], seed: number, now: number): GameState {
  const names = config.teams.map((t) => t.name.trim());
  if (config.teams.length < 1) throw new GameConfigError('At least one team is required');
  if (names.some((n) => !n)) throw new GameConfigError('Every team needs a name');
  if (new Set(names).size !== names.length) throw new GameConfigError('Team names must be unique');
  const deckIds = [...new Set(config.deckIds)];
  const pool = allCards.filter((c) => deckIds.includes(c.deckId));
  if (pool.length === 0) throw new GameConfigError('Select at least one deck with cards');
  // Guard against a card id appearing twice if decks ever overlap.
  const uniqueIds = [...new Set(pool.map((c) => c.id))];

  const teams: Team[] = config.teams.map((t, i) => ({
    id: `team${i + 1}`,
    name: t.name.trim(),
    color: t.color,
    players: (t.players ?? []).map((p) => p.trim()).filter(Boolean),
  }));

  return {
    schemaVersion: GAME_SCHEMA_VERSION,
    id: `g${seed.toString(36)}${now.toString(36)}`,
    createdAt: now,
    updatedAt: now,
    rules: sanitizeRules(config.rules),
    teams,
    deckIds,
    drawPile: shuffle(uniqueIds, createRng(seed)),
    status: 'ready',
    round: 1,
    teamIndex: 0,
    describerIndex: teams.map(() => 0),
    turn: null,
    history: [],
    endReason: null,
    seed,
  };
}

export function configFromGame(state: GameState): GameConfig {
  return {
    teams: state.teams.map((t) => ({ name: t.name, color: t.color, players: t.players })),
    deckIds: state.deckIds,
    rules: state.rules,
  };
}

export function currentTeam(state: GameState): Team {
  return state.teams[state.teamIndex];
}

export function currentDescriber(state: GameState): string | null {
  const team = currentTeam(state);
  if (team.players.length === 0) return null;
  return team.players[state.describerIndex[state.teamIndex] % team.players.length];
}

export function remainingMs(state: GameState, now: number): number {
  const t = state.turn;
  if (!t) return state.rules.turnSeconds * 1000;
  if (state.status === 'active' && t.endsAt !== null) return Math.max(0, t.endsAt - now);
  if (state.status === 'paused') return t.remainingMs;
  return 0;
}

export function skipsUsed(turn: ActiveTurn | null): number {
  return turn ? turn.results.filter((r) => r.outcome === 'skip').length : 0;
}

export function canSkip(state: GameState): boolean {
  const max = state.rules.maxSkipsPerTurn;
  return max === null || skipsUsed(state.turn) < max;
}

/** Points per team for a list of results played by `teamId`. */
export function scoreResults(state: Pick<GameState, 'rules' | 'teams'>, teamId: string, results: readonly CardResult[]) {
  const totals: Record<string, number> = Object.fromEntries(state.teams.map((t) => [t.id, 0]));
  for (const r of results) {
    const p = pointsFor(r.outcome, state.rules);
    for (const team of state.teams) totals[team.id] += team.id === teamId ? p.own : p.others;
  }
  return totals;
}

/** Scores are always derived from recorded results — the single source of truth. */
export function getScores(state: GameState): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(state.teams.map((t) => [t.id, 0]));
  const add = (teamId: string, results: readonly CardResult[]) => {
    const s = scoreResults(state, teamId, results);
    for (const id of Object.keys(totals)) totals[id] += s[id];
  };
  for (const turn of state.history) add(turn.teamId, turn.results);
  if (state.turn && state.status !== 'ready') add(state.turn.teamId, state.turn.results);
  return totals;
}

export interface Standing {
  team: Team;
  score: number;
  rank: number;
}

export function getStandings(state: GameState): Standing[] {
  const scores = getScores(state);
  const sorted = state.teams
    .map((team, i) => ({ team, score: scores[team.id], i }))
    .sort((a, b) => b.score - a.score || a.i - b.i);
  let rank = 0;
  let prev: number | null = null;
  return sorted.map((s, idx) => {
    if (s.score !== prev) rank = idx + 1;
    prev = s.score;
    return { team: s.team, score: s.score, rank };
  });
}

/** Teams sharing the top score. More than one entry means a tie. */
export function getLeaders(state: GameState): Team[] {
  return getStandings(state)
    .filter((s) => s.rank === 1)
    .map((s) => s.team);
}

export function turnsPlayedInRound(state: GameState): number {
  return state.history.filter((h) => h.round === state.round).length;
}

// ---------------------------------------------------------------------------
// Reducer. Invalid actions return the *same* state object (no-op), so callers can detect rejection.
// ---------------------------------------------------------------------------

export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_TURN':
      return startTurn(state, action.now);
    case 'CORRECT':
    case 'SKIP':
    case 'VIOLATION':
      return resolveCard(state, action.type, action.cardId, action.now);
    case 'PAUSE':
      return pause(state, action.now);
    case 'RESUME':
      return resume(state, action.now);
    case 'TICK':
      return tick(state, action.now);
    case 'EDIT_RESULT':
      return editResult(state, action.index, action.outcome);
    case 'CONFIRM_TURN':
      return confirmTurn(state, action.now);
    case 'NEXT_ROUND':
      return nextRound(state, action.now);
    case 'END_GAME':
      return endGame(state, action.now);
  }
}

function startTurn(state: GameState, now: number): GameState {
  if (state.status !== 'ready') return state;
  if (state.drawPile.length === 0) return { ...state, status: 'completed', endReason: 'deck_exhausted', turn: null, updatedAt: now };
  const [first, ...rest] = state.drawPile;
  const turn: ActiveTurn = {
    number: state.history.length + 1,
    teamId: currentTeam(state).id,
    describer: currentDescriber(state),
    endsAt: now + state.rules.turnSeconds * 1000,
    remainingMs: state.rules.turnSeconds * 1000,
    currentCardId: first,
    results: [],
    endedBy: null,
  };
  return { ...state, status: 'active', turn, drawPile: rest, updatedAt: now };
}

const OUTCOME_OF = { CORRECT: 'correct', SKIP: 'skip', VIOLATION: 'violation' } as const;

function resolveCard(state: GameState, type: keyof typeof OUTCOME_OF, cardId: string, now: number): GameState {
  const turn = state.turn;
  if (state.status !== 'active' || !turn || turn.currentCardId === null) return state;
  // Stale or duplicate tap (e.g. double-click on a card already scored).
  if (turn.currentCardId !== cardId) return state;
  // A tap that arrives after the deadline must not score; the turn simply expires.
  if (turn.endsAt !== null && now >= turn.endsAt) return expire(state, now);
  if (type === 'SKIP' && !canSkip(state)) return state;

  const results = [...turn.results, { cardId, outcome: OUTCOME_OF[type], at: now }];
  const [next, ...rest] = state.drawPile;
  if (next === undefined) {
    return {
      ...state,
      status: 'review',
      turn: { ...turn, results, currentCardId: null, endsAt: null, remainingMs: 0, endedBy: 'deck' },
      updatedAt: now,
    };
  }
  return { ...state, turn: { ...turn, results, currentCardId: next }, drawPile: rest, updatedAt: now };
}

function expire(state: GameState, now: number): GameState {
  const turn = state.turn;
  if (!turn || (state.status !== 'active' && state.status !== 'paused')) return state;
  const results =
    turn.currentCardId !== null ? [...turn.results, { cardId: turn.currentCardId, outcome: 'timeout' as const, at: now }] : turn.results;
  return {
    ...state,
    status: 'review',
    turn: { ...turn, results, currentCardId: null, endsAt: null, remainingMs: 0, endedBy: 'time' },
    updatedAt: now,
  };
}

function tick(state: GameState, now: number): GameState {
  if (state.status !== 'active' || !state.turn || state.turn.endsAt === null) return state;
  return now >= state.turn.endsAt ? expire(state, now) : state;
}

function pause(state: GameState, now: number): GameState {
  const turn = state.turn;
  if (state.status !== 'active' || !turn || turn.endsAt === null) return state;
  const left = turn.endsAt - now;
  if (left <= 0) return expire(state, now);
  return { ...state, status: 'paused', turn: { ...turn, endsAt: null, remainingMs: left }, updatedAt: now };
}

function resume(state: GameState, now: number): GameState {
  const turn = state.turn;
  if (state.status !== 'paused' || !turn) return state;
  if (turn.remainingMs <= 0) return expire(state, now);
  return { ...state, status: 'active', turn: { ...turn, endsAt: now + turn.remainingMs }, updatedAt: now };
}

function editResult(state: GameState, index: number, outcome: Outcome): GameState {
  const turn = state.turn;
  if (state.status !== 'review' || !turn || index < 0 || index >= turn.results.length) return state;
  if (turn.results[index].outcome === outcome) return state;
  const max = state.rules.maxSkipsPerTurn;
  if (outcome === 'skip' && max !== null && skipsUsed(turn) >= max) return state;
  const results = turn.results.map((r, i) => (i === index ? { ...r, outcome } : r));
  return { ...state, turn: { ...turn, results } };
}

function recordTurn(state: GameState): { history: TurnRecord[]; drawPile: string[] } {
  const turn = state.turn!;
  const record: TurnRecord = {
    number: turn.number,
    round: state.round,
    teamId: turn.teamId,
    describer: turn.describer,
    results: turn.results,
  };
  const recycled = state.rules.recycleSkipped ? turn.results.filter((r) => r.outcome === 'skip').map((r) => r.cardId) : [];
  return { history: [...state.history, record], drawPile: [...state.drawPile, ...recycled] };
}

function isEndConditionMet(state: GameState): boolean {
  const end = state.rules.endCondition;
  if (end.type === 'rounds') return state.round >= end.rounds;
  const scores = getScores(state);
  return Object.values(scores).some((s) => s >= end.target);
}

function confirmTurn(state: GameState, now: number): GameState {
  if (state.status !== 'review' || !state.turn) return state;
  const { history, drawPile } = recordTurn(state);
  const describerIndex = state.describerIndex.map((d, i) => (i === state.teamIndex ? d + 1 : d));
  const base: GameState = { ...state, history, drawPile, describerIndex, turn: null, updatedAt: now };
  const lastInRound = state.teamIndex === state.teams.length - 1;

  if (lastInRound) {
    if (isEndConditionMet(base)) return { ...base, status: 'completed', endReason: state.rules.endCondition.type };
    if (drawPile.length === 0) return { ...base, status: 'completed', endReason: 'deck_exhausted' };
    return { ...base, status: 'round_summary' };
  }
  if (drawPile.length === 0) return { ...base, status: 'completed', endReason: 'deck_exhausted' };
  return { ...base, status: 'ready', teamIndex: state.teamIndex + 1 };
}

function nextRound(state: GameState, now: number): GameState {
  if (state.status !== 'round_summary') return state;
  if (state.drawPile.length === 0) return { ...state, status: 'completed', endReason: 'deck_exhausted', updatedAt: now };
  return { ...state, status: 'ready', round: state.round + 1, teamIndex: 0, updatedAt: now };
}

/** Players chose to stop early. Results of an in-progress turn are kept (the card on screen is not scored). */
function endGame(state: GameState, now: number): GameState {
  if (state.status === 'completed') return state;
  let history = state.history;
  if (state.turn && state.status !== 'ready' && state.turn.results.length > 0) {
    history = recordTurn(state).history;
  }
  return { ...state, history, turn: null, status: 'completed', endReason: null, updatedAt: now };
}
