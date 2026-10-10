// Platform-neutral game types. Nothing in src/core may import from React, the DOM or browser APIs.

export interface Card {
  id: string;
  deckId: string;
  target: string;
  forbidden: string[];
  source: { pdf: string; page: number };
}

export interface Deck {
  id: string;
  title: string;
  sourcePdf: string;
  alsoIn: string[];
  cards: Card[];
}

export type EndCondition =
  | { type: 'rounds'; rounds: number }
  | { type: 'score'; target: number };

/** Who receives points when a forbidden word is spoken. */
export type ViolationRecipient = 'none' | 'opponents';

export interface Rules {
  /** Length of one describing turn, in seconds. */
  turnSeconds: number;
  pointsCorrect: number;
  /** Points deducted from the describing team for a skip (0 = free skip). */
  skipPenalty: number;
  /** Max skips per turn; null = unlimited. */
  maxSkipsPerTurn: number | null;
  /** Points deducted from the describing team when a forbidden word is spoken. */
  violationPenalty: number;
  /** If 'opponents', every other team also gains `violationPenalty` points. */
  violationRecipient: ViolationRecipient;
  /** If true, cards skipped in a turn go to the bottom of the draw pile when the turn is confirmed (never repeat within a turn). */
  recycleSkipped: boolean;
  endCondition: EndCondition;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  players: string[];
}

export type Outcome = 'correct' | 'skip' | 'violation' | 'timeout';

export interface CardResult {
  cardId: string;
  outcome: Outcome;
  at: number;
}

export interface TurnRecord {
  number: number;
  round: number;
  teamId: string;
  describer: string | null;
  results: CardResult[];
}

export type GameStatus =
  | 'ready' // waiting for the describing team to start
  | 'active' // timer running
  | 'paused'
  | 'review' // turn finished, results can be corrected before confirming
  | 'round_summary'
  | 'completed';

export type EndReason = 'rounds' | 'score' | 'deck_exhausted' | null;

export interface ActiveTurn {
  number: number;
  teamId: string;
  describer: string | null;
  /** Epoch ms when the turn ends; null while paused or before start. */
  endsAt: number | null;
  /** Remaining ms captured when paused. */
  remainingMs: number;
  currentCardId: string | null;
  results: CardResult[];
  /** Why the turn finished (set on entering review). */
  endedBy: 'time' | 'deck' | null;
}

export interface GameState {
  schemaVersion: number;
  id: string;
  createdAt: number;
  updatedAt: number;
  rules: Rules;
  teams: Team[];
  deckIds: string[];
  /** Card ids still to draw, top of pile at index 0. */
  drawPile: string[];
  status: GameStatus;
  /** 1-based round number. A round = every team has had one turn. */
  round: number;
  /** Index into `teams` of the team whose turn it is (or was, during review). */
  teamIndex: number;
  /** Per-team rotation pointer into `players`. */
  describerIndex: number[];
  turn: ActiveTurn | null;
  history: TurnRecord[];
  endReason: EndReason;
  seed: number;
}

export type GameAction =
  | { type: 'START_TURN'; now: number }
  | { type: 'CORRECT'; cardId: string; now: number }
  | { type: 'SKIP'; cardId: string; now: number }
  | { type: 'VIOLATION'; cardId: string; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'EDIT_RESULT'; index: number; outcome: Outcome }
  | { type: 'CONFIRM_TURN'; now: number }
  | { type: 'NEXT_ROUND'; now: number }
  | { type: 'END_GAME'; now: number };

export interface GameConfig {
  teams: { name: string; color: string; players?: string[] }[];
  deckIds: string[];
  rules: Rules;
}
