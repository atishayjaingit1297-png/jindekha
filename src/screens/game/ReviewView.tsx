import { canSkip, currentTeam, pointsFor, reduce } from '../../core';
import type { Outcome } from '../../core';
import { CARD_BY_ID } from '../../content';
import { useApp } from '../../state/AppContext';
import { hi } from '../../i18n/hi';
import { Icon } from '../../ui/Icon';
import { IconButton, useArmed } from '../../ui/controls';
import { Standings, TeamChip } from '../../ui/TeamBits';
import type { GameViewProps } from './Game';

const OUTCOMES: Outcome[] = ['correct', 'skip', 'violation', 'timeout'];

export function OutcomeTag({ outcome }: { outcome: Outcome }) {
  return <span className={`outcome ${outcome}`}>{hi.outcome[outcome]}</span>;
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export function ReviewView({ navigate, openScoreboard }: GameViewProps) {
  const { game, dispatch } = useApp();
  const armed = useArmed();
  if (!game || !game.turn) return null;
  const turn = game.turn;
  const team = currentTeam(game);
  const own = turn.results.reduce((n, r) => n + pointsFor(r.outcome, game.rules).own, 0);
  const toOthers = turn.results.reduce((n, r) => n + pointsFor(r.outcome, game.rules).others, 0);

  // Preview where confirming leads, using the pure engine, so the button can say exactly what's next.
  const next = reduce(game, { type: 'CONFIRM_TURN', now: Date.now() });
  const nextLabel = next.status === 'completed' ? hi.game.seeResults : next.status === 'round_summary' ? hi.game.seeRoundSummary : hi.game.nextTurn;

  return (
    <main className="screen">
      <header className="topbar">
        <IconButton icon="home" label={hi.game.home} onClick={() => navigate('home')} />
        <span className="spacer" />
        <IconButton icon="chart" label={hi.game.scoreboard} onClick={openScoreboard} />
      </header>
      <div className="headline">
        <h1>{turn.endedBy === 'deck' ? hi.game.deckEnded : hi.game.timeUp}</h1>
        <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
          <TeamChip team={team} />
        </div>
      </div>

      <section className="panel stack">
        <h2>{hi.game.turnSummary}</h2>
        {turn.results.length === 0 ? (
          <p className="muted">{hi.game.noCards}</p>
        ) : (
          <>
            <p className="muted small" style={{ margin: 0 }}>
              {hi.game.reviewHelp}
            </p>
            <ul className="result-list">
              {turn.results.map((r, i) => {
                const card = CARD_BY_ID.get(r.cardId);
                const word = card?.target ?? r.cardId;
                // "Time up" only makes sense for the card that was on screen when the clock ran out.
                const options = OUTCOMES.filter((o) => o !== 'timeout' || (turn.endedBy === 'time' && i === turn.results.length - 1));
                return (
                  <li key={r.cardId} className="result-item">
                    <div className="row">
                      <span className="word" lang="hi">
                        {word}
                      </span>
                      <span className="delta">{signed(pointsFor(r.outcome, game.rules).own)}</span>
                    </div>
                    <div className="outcome-picker" role="radiogroup" aria-label={word}>
                      {options.map((o) => (
                        <button
                          type="button"
                          key={o}
                          role="radio"
                          aria-checked={r.outcome === o}
                          className={`outcome ${o}`}
                          disabled={o === 'skip' && r.outcome !== 'skip' && !canSkip(game)}
                          onClick={() => dispatch({ type: 'EDIT_RESULT', index: i, outcome: o })}
                        >
                          {hi.outcome[o]}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className="turn-total">
          <span>{hi.game.pointsThisTurn}</span>
          <span style={{ color: own >= 0 ? 'var(--forest)' : 'var(--danger)' }}>{signed(own)}</span>
        </div>
        {toOthers > 0 && <p className="muted small" style={{ margin: 0 }}>{hi.game.toOpponents(toOthers)}</p>}
      </section>

      <Standings game={game} />

      <div className="sticky-bottom">
        <button type="button" className="btn primary block lg" disabled={!armed} onClick={() => dispatch({ type: 'CONFIRM_TURN', now: Date.now() })}>
          {nextLabel} <Icon name="play" />
        </button>
      </div>
    </main>
  );
}
