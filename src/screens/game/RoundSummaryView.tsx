import { getLeaders, getScores } from '../../core';
import { useApp } from '../../state/AppContext';
import { useT } from '../../i18n';
import { Icon } from '../../ui/Icon';
import { IconButton, useArmed } from '../../ui/controls';
import { Standings } from '../../ui/TeamBits';
import { TurnHistory } from './ScoreboardSheet';
import type { GameViewProps } from './Game';

export function RoundSummaryView({ navigate }: GameViewProps) {
  const t = useT();
  const { game, dispatch } = useApp();
  const armed = useArmed();
  if (!game) return null;
  const leaders = getLeaders(game);
  const end = game.rules.endCondition;

  return (
    <main className="screen">
      <header className="topbar">
        <IconButton icon="home" label={t.game.home} onClick={() => navigate('home')} />
      </header>
      <div className="headline">
        <h1>{t.game.roundDone(game.round)}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {game.teams.length === 1
            ? t.game.soloTotal(getScores(game)[game.teams[0].id])
            : leaders.length > 1
              ? `${t.game.tied}: ${leaders.map((x) => x.name).join(', ')}`
              : `${t.game.leading}: ${leaders[0].name}`}
          {end.type === 'rounds' ? ` · ${t.game.of(game.round, end.rounds)} ${t.setup.rounds}` : ` · ${t.setup.targetScore} ${end.target}`}
        </p>
      </div>
      <Standings game={game} />
      <section className="panel">
        <h2>{t.score.history}</h2>
        <TurnHistory game={game} onlyRound={game.round} />
      </section>
      <div className="sticky-bottom">
        <button type="button" className="btn primary block lg" disabled={!armed} onClick={() => dispatch({ type: 'NEXT_ROUND', now: Date.now() })}>
          {t.game.nextRound} <Icon name="play" />
        </button>
      </div>
    </main>
  );
}
