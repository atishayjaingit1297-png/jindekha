import type { Outcome, Rules } from './types';

/**
 * Jin-Dekha default ruleset. These are our own documented defaults (see docs/RULES.md),
 * not a claim about any other game's exact rules.
 */
export const DEFAULT_RULES: Rules = {
  turnSeconds: 60,
  pointsCorrect: 1,
  skipPenalty: 0,
  maxSkipsPerTurn: null,
  violationPenalty: 1,
  violationRecipient: 'none',
  recycleSkipped: false,
  endCondition: { type: 'rounds', rounds: 3 },
};

export const LIMITS = {
  turnSeconds: { min: 15, max: 300 },
  points: { min: 0, max: 10 },
  rounds: { min: 1, max: 20 },
  targetScore: { min: 5, max: 200 },
  teams: { min: 2, max: 6 },
  maxSkips: { min: 0, max: 20 },
} as const;

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(max, Math.max(min, n));
};

/** Returns a valid Rules object, repairing out-of-range or missing values with defaults. */
export function sanitizeRules(input: Partial<Rules> | undefined | null): Rules {
  const r = input ?? {};
  const d = DEFAULT_RULES;
  const end = r.endCondition;
  const endCondition: Rules['endCondition'] =
    end && end.type === 'score'
      ? { type: 'score', target: clampInt(end.target, LIMITS.targetScore.min, LIMITS.targetScore.max, 20) }
      : {
          type: 'rounds',
          rounds: clampInt(end && end.type === 'rounds' ? end.rounds : undefined, LIMITS.rounds.min, LIMITS.rounds.max, 3),
        };
  return {
    turnSeconds: clampInt(r.turnSeconds, LIMITS.turnSeconds.min, LIMITS.turnSeconds.max, d.turnSeconds),
    pointsCorrect: clampInt(r.pointsCorrect, 1, LIMITS.points.max, d.pointsCorrect),
    skipPenalty: clampInt(r.skipPenalty, LIMITS.points.min, LIMITS.points.max, d.skipPenalty),
    maxSkipsPerTurn:
      r.maxSkipsPerTurn === null || r.maxSkipsPerTurn === undefined
        ? null
        : clampInt(r.maxSkipsPerTurn, LIMITS.maxSkips.min, LIMITS.maxSkips.max, 3),
    violationPenalty: clampInt(r.violationPenalty, LIMITS.points.min, LIMITS.points.max, d.violationPenalty),
    violationRecipient: r.violationRecipient === 'opponents' ? 'opponents' : 'none',
    recycleSkipped: Boolean(r.recycleSkipped),
    endCondition,
  };
}

/**
 * The single place where an outcome is turned into points.
 * `own` applies to the describing team; `others` applies to every other team.
 */
export function pointsFor(outcome: Outcome, rules: Rules): { own: number; others: number } {
  switch (outcome) {
    case 'correct':
      return { own: rules.pointsCorrect, others: 0 };
    case 'skip':
      return { own: -rules.skipPenalty, others: 0 };
    case 'violation':
      return rules.violationRecipient === 'opponents'
        ? { own: -rules.violationPenalty, others: rules.violationPenalty }
        : { own: -rules.violationPenalty, others: 0 };
    case 'timeout':
      return { own: 0, others: 0 };
  }
}
