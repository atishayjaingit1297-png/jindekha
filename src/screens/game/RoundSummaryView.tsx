import { getLeaders } from '../../core';
import { useApp } from '../../state/AppContext';
import { hi } from '../../i18n/hi';
import { Icon } from '../../ui/Icon';
import { IconButton, useArmed } from '../../ui/controls';
import { Standings } from '../../ui/TeamBits';
import { TurnHistory } from './ScoreboardSheet';
import type { GameViewProps } from './Game';

export function RoundSummaryView({ navigate }: GameViewProps) {
  const { game, dispatch } = useApp();
  const armed = useArmed();
  if (!game) return null;
  const leaders = getLeaders(game);
  const end = game.rules.endCondition;

  return (
    <main className="screen">
      <header className="topbar">
        <IconButton icon="home" label={hi.game.home} onClick={() => navigate('home')} />
      </header>
      <div className="headline">
        <h1>{hi.game.roundDone(game.round)}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {leaders.length > 1 ? `${hi.game.tied}: ${leaders.map((t) => t.name).join(', ')}` : `${hi.game.leading}: ${leaders[0].name}`}
          {end.type === 'rounds' ? ` · ${hi.game.of(game.round, end.rounds)} ${hi.setup.rounds}` : ` · ${hi.setup.targetScore} ${end.target}`}
        </p>
      </div>
      <Standings game={game} />
      <section className="panel">
        <h2>{hi.score.history}</h2>
        <TurnHistory game={game} onlyRound={game.round} />
      </section>
      <div className="sticky-bottom">
        <button type="button" className="btn primary block lg" disabled={!armed} onClick={() => dispatch({ type: 'NEXT_ROUND', now: Date.now() })}>
          {hi.game.nextRound} <Icon name="play" />
        </button>
      </div>
    </main>
  );
}
