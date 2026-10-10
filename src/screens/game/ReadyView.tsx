import { useState } from 'react';
import { currentDescriber, currentTeam, getScores, turnsPlayedInRound } from '../../core';
import { useApp } from '../../state/AppContext';
import { useT } from '../../i18n';
import { Icon } from '../../ui/Icon';
import { ConfirmDialog, IconButton, QuickToggles, useArmed } from '../../ui/controls';
import type { GameViewProps } from './Game';

export function ReadyView({ navigate, openScoreboard }: GameViewProps) {
  const t = useT();
  const { game, dispatch, prefs, updatePrefs } = useApp();
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
        <IconButton icon="home" label={t.game.home} onClick={() => navigate('home')} />
        <span className="spacer center muted">
          {t.game.round(game.round)}
          {end.type === 'rounds' && `/${end.rounds}`} · {t.game.turnShort} {turnsPlayedInRound(game) + 1}/{game.teams.length}
        </span>
        <IconButton icon="chart" label={t.game.scoreboard} onClick={openScoreboard} />
      </header>

      <div className="ready-body">
      <div className="stack" style={{ alignItems: 'center', gap: 8 }}>
        <span className="turn-of">{t.game.turnOf}</span>
        <div className="team-hero" style={{ ['--team' as string]: team.color }}>
          {team.name}
        </div>
        <span className="score-pill">{t.common.pts(scores[team.id])}</span>
      </div>

      <section className="panel role-card">
        <Icon name="user" />
        <span>
          {describer ? (
            <>
              <strong style={{ fontSize: '1.2em' }}>{describer}</strong> {t.game.describer}
            </>
          ) : (
            t.game.describerAny
          )}
        </span>
        <Icon name="users" />
        <span>{t.game.guessers}</span>
        <Icon name="ear" />
        <span className="muted small">{t.game.readyHelp}</span>
      </section>

      <button type="button" data-cue="own" className="btn primary big-start" style={{ background: team.color, boxShadow: 'var(--shadow-lg)' }} disabled={!armed} onClick={() => dispatch({ type: 'START_TURN', now: Date.now() })}>
        <Icon name="play" /> {t.game.start} · {t.setup.seconds(game.rules.turnSeconds)}
      </button>
      <p className="muted small" style={{ margin: 0 }}>
        {t.game.lastCard}: {game.drawPile.length}
      </p>
      <QuickToggles
        sound={prefs.sound}
        haptics={prefs.haptics}
        onSound={(v) => updatePrefs({ sound: v })}
        onHaptics={(v) => updatePrefs({ haptics: v })}
        labels={{ sound: t.game.soundToggle, haptics: t.game.hapticsToggle }}
      />
      <button type="button" className="btn danger-text" onClick={() => setConfirmEnd(true)}>
        {t.game.endGame}
      </button>
      </div>

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
