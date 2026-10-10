import { useState } from 'react';
import { currentDescriber, currentTeam, getScores, turnsPlayedInRound } from '../../core';
import { useApp } from '../../state/AppContext';
import { hi } from '../../i18n/hi';
import { Icon } from '../../ui/Icon';
import { ConfirmDialog, IconButton, useArmed } from '../../ui/controls';
import type { GameViewProps } from './Game';

export function ReadyView({ navigate, openScoreboard }: GameViewProps) {
  const { game, dispatch } = useApp();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const armed = useArmed();
  if (!game) return null;
  const team = currentTeam(game);
  const describer = currentDescriber(game);
  const scores = getScores(game);
  const end = game.rules.endCondition;

  return (
    <main className="screen ready">
      <header className="topbar" style={{ width: '100%' }}>
        <IconButton icon="home" label={hi.game.home} onClick={() => navigate('home')} />
        <span className="spacer center muted">
          {hi.game.round(game.round)}
          {end.type === 'rounds' && `/${end.rounds}`} · {hi.game.turnShort} {turnsPlayedInRound(game) + 1}/{game.teams.length}
        </span>
        <IconButton icon="chart" label={hi.game.scoreboard} onClick={openScoreboard} />
      </header>

      <div className="ready-body">
      <div className="stack" style={{ alignItems: 'center', gap: 8 }}>
        <span className="turn-of">{hi.game.turnOf}</span>
        <div className="team-hero" style={{ color: team.color }}>
          {team.name}
        </div>
        <span className="score-pill">{hi.common.pts(scores[team.id])}</span>
      </div>

      <section className="panel role-card">
        <Icon name="user" />
        <span>
          {describer ? (
            <>
              <strong style={{ fontSize: '1.2em' }}>{describer}</strong> {hi.game.describer}
            </>
          ) : (
            hi.game.describerAny
          )}
        </span>
        <Icon name="users" />
        <span>{hi.game.guessers}</span>
        <Icon name="ear" />
        <span className="muted small">{hi.game.readyHelp}</span>
      </section>

      <button type="button" className="btn primary big-start" style={{ background: team.color, boxShadow: 'var(--shadow-lg)' }} disabled={!armed} onClick={() => dispatch({ type: 'START_TURN', now: Date.now() })}>
        <Icon name="play" /> {hi.game.start} · {hi.setup.seconds(game.rules.turnSeconds)}
      </button>
      <p className="muted small" style={{ margin: 0 }}>
        {hi.game.lastCard}: {game.drawPile.length}
      </p>
      <button type="button" className="btn danger-text" onClick={() => setConfirmEnd(true)}>
        {hi.game.endGame}
      </button>
      </div>

      {confirmEnd && (
        <ConfirmDialog
          message={hi.game.endGameConfirm}
          confirmLabel={hi.game.endGame}
          cancelLabel={hi.common.cancel}
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
