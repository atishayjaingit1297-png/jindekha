import { useEffect, useRef, useState } from 'react';
import { remainingMs } from '../core';
import type { GameState } from '../core';
import { useApp } from './AppContext';

/**
 * Remaining turn time, recomputed from the deadline every 100 ms — never by counting ticks,
 * so throttled timers or a sleeping tab cannot make it drift. Exactly one interval exists per
 * running turn and it is cleared whenever the turn pauses, ends or the screen unmounts.
 */
export function useCountdown(game: GameState): number {
  const { dispatch, cue } = useApp();
  const [, setNow] = useState(() => Date.now());
  const lastWhole = useRef<number | null>(null);
  const endsAt = game.status === 'active' ? game.turn?.endsAt ?? null : null;

  useEffect(() => {
    if (endsAt === null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) dispatch({ type: 'TICK', now: t }); // engine processes expiry once; repeats are no-ops
    }, 100);
    return () => window.clearInterval(id);
  }, [endsAt, dispatch]);

  // Always measured against the real clock at render time, so a resume never shows a stale value.
  const left = remainingMs(game, Date.now());

  // Soft tick in the last five seconds.
  useEffect(() => {
    if (endsAt === null) {
      lastWhole.current = null;
      return;
    }
    const whole = Math.ceil(left / 1000);
    if (whole !== lastWhole.current) {
      if (lastWhole.current !== null && whole <= 5 && whole > 0) cue('tick');
      lastWhole.current = whole;
    }
  }, [left, endsAt, cue]);

  return left;
}
