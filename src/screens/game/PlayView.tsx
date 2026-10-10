import { useCallback, useEffect, useRef, useState } from 'react';
import { canSkip, currentTeam, getScores, pointsFor, skipsUsed } from '../../core';
import type { Outcome } from '../../core';
import { CARD_BY_ID } from '../../content';
import { useApp } from '../../state/AppContext';
import { useCountdown } from '../../state/useCountdown';
import { useT } from '../../i18n';
import { Icon } from '../../ui/Icon';
import { ConfirmDialog, IconButton, Sheet } from '../../ui/controls';
import { TeamChip } from '../../ui/TeamBits';
import type { GameViewProps } from './Game';

type CardAction = 'CORRECT' | 'SKIP' | 'VIOLATION';
const OUTCOME: Record<CardAction, Exclude<Outcome, 'timeout'>> = { CORRECT: 'correct', SKIP: 'skip', VIOLATION: 'violation' };

function formatTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function PlayView({ navigate, openScoreboard }: GameViewProps) {
  const t = useT();
  const { game, dispatch } = useApp();
  const [feedback, setFeedback] = useState<{ kind: Outcome; text: string; key: number } | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const fbTimer = useRef<number | undefined>(undefined);
  const left = useCountdown(game!);

  const act = useCallback(
    (type: CardAction) => {
      const g = game;
      const cardId = g?.turn?.currentCardId;
      if (!g || g.status !== 'active' || !cardId) return;
      if (!dispatch({ type, cardId, now: Date.now() })) return;
      const pts = pointsFor(OUTCOME[type], g.rules).own;
      const text = pts > 0 ? `+${pts}` : pts < 0 ? `−${-pts}` : t.outcome[OUTCOME[type]];
      setFeedback({ kind: OUTCOME[type], text, key: Date.now() });
      window.clearTimeout(fbTimer.current);
      fbTimer.current = window.setTimeout(() => setFeedback(null), 800);
    },
    [game, dispatch],
  );

  // Desktop / keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.repeat) return;
      if (game?.status === 'active') {
        if (e.key === 'ArrowRight' || e.key === 'Enter') act('CORRECT');
        else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') act('SKIP');
        else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'x') act('VIOLATION');
        else if (e.key === ' ' || e.key === 'Escape') dispatch({ type: 'PAUSE', now: Date.now() });
        else return;
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game?.status, act, dispatch]);

  useEffect(() => () => window.clearTimeout(fbTimer.current), []);

  if (!game || !game.turn) return null;
  const turn = game.turn;
  const team = currentTeam(game);
  const card = turn.currentCardId ? CARD_BY_ID.get(turn.currentCardId) : undefined;
  const paused = game.status === 'paused';
  const total = game.rules.turnSeconds * 1000;
  const warn = left <= 10_000;
  const maxSkips = game.rules.maxSkipsPerTurn;
  const turnPoints = turn.results.reduce((n, r) => n + pointsFor(r.outcome, game.rules).own, 0);
  const pause = () => dispatch({ type: 'PAUSE', now: Date.now() });

  return (
    <main className="screen play" aria-label={t.game.turnAria(team.name)}>
      <header className="status-line">
        <TeamChip team={team} />
        <span className="score-pill">
          {t.game.turnShort} {turnPoints >= 0 ? `+${turnPoints}` : `−${-turnPoints}`} · {t.game.totalShort} {getScores(game)[team.id]}
        </span>
        <IconButton icon="pause" label={t.game.pause} onClick={pause} />
      </header>

      <div className={`timer ${warn ? 'warn' : ''}`} role="timer" aria-label={t.game.secondsLeft(Math.ceil(left / 1000))}>
        <div className="fill" style={{ width: `${(left / total) * 100}%` }} />
        <span className="digits">{formatTime(left)}</span>
      </div>

      <div className="card-stage">
        {card && !paused && (
          <article className="word-card" key={card.id} aria-live="polite">
            <div className="target">
              <div className="label">{t.game.explain}</div>
              <h2 lang="hi">{card.target}</h2>
            </div>
            <div className="forbidden">
              <div className="label">⛔ {t.game.forbidden}</div>
              <ul>
                {card.forbidden.map((w) => (
                  <li key={w} lang="hi">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        )}
      </div>

      <div className="actions">
        <button type="button" className="action violation" onClick={() => act('VIOLATION')} disabled={paused}>
          <Icon name="alert" />
          {t.game.violation}
        </button>
        <button type="button" className="action skip" onClick={() => act('SKIP')} disabled={paused || !canSkip(game)}>
          <Icon name="skip" />
          {t.game.skip}
          {maxSkips !== null && <small>{t.game.skipsLeft(Math.max(0, maxSkips - skipsUsed(turn)))}</small>}
        </button>
        <button type="button" className="action correct" onClick={() => act('CORRECT')} disabled={paused}>
          <Icon name="check" />
          {t.game.correct}
        </button>
      </div>

      {feedback && (
        <>
          <div key={`f${feedback.key}`} className={`flash ${feedback.kind}`} />
          <div
            key={`p${feedback.key}`}
            className="float-points"
            style={{ color: feedback.kind === 'correct' ? 'var(--forest)' : feedback.kind === 'violation' ? 'var(--danger)' : 'var(--ink-2)' }}
            aria-hidden
          >
            {feedback.text}
          </div>
        </>
      )}

      {paused && !confirmEnd && (
        <Sheet title={t.game.paused} className="pause-sheet">
          <p className="muted" style={{ margin: 0 }}>
            {t.game.pausedHelp}
          </p>
          <div className="timer" style={{ height: 56 }}>
            <span className="digits">{formatTime(turn.remainingMs)}</span>
          </div>
          <button type="button" className="btn primary block lg" onClick={() => dispatch({ type: 'RESUME', now: Date.now() })} autoFocus>
            <Icon name="play" /> {t.game.resume}
          </button>
          <div className="grid-2">
            <button type="button" className="btn secondary" onClick={openScoreboard}>
              <Icon name="chart" /> {t.game.scoreboard}
            </button>
            <button type="button" className="btn secondary" onClick={() => navigate('home')}>
              <Icon name="home" /> {t.game.home}
            </button>
          </div>
          <button type="button" className="btn danger-text" onClick={() => setConfirmEnd(true)}>
            {t.game.endGame}
          </button>
        </Sheet>
      )}
      {confirmEnd && (
        <ConfirmDialog
          message={t.game.endGameConfirm}
          confirmLabel={t.game.endGame}
          cancelLabel={t.common.cancel}
          danger
          onCancel={() => setConfirmEnd(false)}
          onConfirm={() => {
            setConfirmEnd(false);
            dispatch({ type: 'END_GAME', now: Date.now() });
          }}
        />
      )}
    </main>
  );
}
