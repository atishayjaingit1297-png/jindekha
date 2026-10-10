import { scoreResults } from '../../core';
import type { GameState } from '../../core';
import { CARD_BY_ID } from '../../content';
import { hi } from '../../i18n/hi';
import { Sheet } from '../../ui/controls';
import { Standings } from '../../ui/TeamBits';
import { OutcomeTag } from './ReviewView';

export function TurnHistory({ game, onlyRound }: { game: GameState; onlyRound?: number }) {
  const turns = game.history.filter((h) => onlyRound === undefined || h.round === onlyRound);
  if (turns.length === 0) return <p className="muted">{hi.score.noHistory}</p>;
  return (
    <div className="stack">
      {turns.map((t) => {
        const team = game.teams.find((x) => x.id === t.teamId);
        const pts = scoreResults(game, t.teamId, t.results)[t.teamId];
        return (
          <div key={t.number} className="history-turn" style={{ ['--c' as string]: team?.color }}>
            <div className="row">
              <strong>{team?.name}</strong>
              <span className="muted small">
                {hi.game.round(t.round)}
                {t.describer ? ` · ${t.describer}` : ''}
              </span>
              <span className="spacer" />
              <strong>{pts > 0 ? `+${pts}` : pts}</strong>
            </div>
            <div className="words">
              {t.results.map((r) => (
                <span key={r.cardId} className="row small" style={{ gap: 4 }}>
                  <span lang="hi">{CARD_BY_ID.get(r.cardId)?.target ?? r.cardId}</span>
                  <OutcomeTag outcome={r.outcome} />
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreboardSheet({ game, onClose }: { game: GameState; onClose: () => void }) {
  return (
    <Sheet title={hi.score.title} onClose={onClose}>
      <div className="stack" style={{ marginTop: 12 }}>
        <p className="muted small" style={{ margin: 0 }}>
          {hi.game.round(game.round)}
          {game.rules.endCondition.type === 'rounds' ? ` / ${game.rules.endCondition.rounds}` : ` · ${hi.setup.targetScore} ${game.rules.endCondition.target}`}
        </p>
        <Standings game={game} />
        <h3 className="section-title">{hi.score.history}</h3>
        <TurnHistory game={game} />
        <button type="button" className="btn secondary block" onClick={onClose} autoFocus>
          {hi.score.close}
        </button>
      </div>
    </Sheet>
  );
}
