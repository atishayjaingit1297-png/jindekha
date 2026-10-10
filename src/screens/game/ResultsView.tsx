import { useState } from 'react';
import { getLeaders, getStandings, scoreResults } from '../../core';
import { useApp } from '../../state/AppContext';
import { hi } from '../../i18n/hi';
import { Icon } from '../../ui/Icon';
import { Toast } from '../../ui/controls';
import { Standings } from '../../ui/TeamBits';
import { TurnHistory } from './ScoreboardSheet';
import type { GameViewProps } from './Game';

const CONFETTI = ['#E07B17', '#7A1F2B', '#2F6B4F', '#C99A2E', '#3D4E9C', '#FFFAF0'];

export function ResultsView({ navigate }: GameViewProps) {
  const { game, rematch, platform } = useApp();
  const [toast, setToast] = useState<string | null>(null);
  if (!game) return null;

  const leaders = getLeaders(game);
  const tie = leaders.length > 1;
  const standings = getStandings(game);
  const allResults = game.history.flatMap((h) => h.results);
  const correct = allResults.filter((r) => r.outcome === 'correct').length;
  const best = game.history
    .map((h) => ({ h, pts: scoreResults(game, h.teamId, h.results)[h.teamId] }))
    .sort((a, b) => b.pts - a.pts)[0];
  const bestTeam = best && game.teams.find((t) => t.id === best.h.teamId);

  const end = game.rules.endCondition;
  const reason =
    game.endReason === 'rounds' && end.type === 'rounds'
      ? hi.results.endedRounds(end.rounds)
      : game.endReason === 'score' && end.type === 'score'
        ? hi.results.endedScore(end.target)
        : game.endReason === 'deck_exhausted'
          ? hi.results.endedDeck
          : hi.results.endedManual;

  const bg = tie ? 'linear-gradient(135deg, #7A1F2B, #E07B17)' : `linear-gradient(135deg, ${leaders[0].color}, #2b1a12)`;

  const share = async () => {
    const lines = standings.map((s) => `${s.rank}. ${s.team.name} — ${hi.common.pts(s.score)}`).join('\n');
    const r = await platform.share(hi.results.shareText(lines));
    if (r === 'copied') setToast(hi.results.copied);
  };

  return (
    <main className="screen">
      <section className="winner" style={{ background: bg }} aria-live="polite">
        <div className="confetti" aria-hidden>
          {Array.from({ length: 18 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 6) * 0.35}s` }} />
          ))}
        </div>
        <Icon name="trophy" className="crown" />
        <p>{tie ? hi.results.tie : hi.results.winner}</p>
        <h1>{tie ? leaders.map((t) => t.name).join(' · ') : leaders[0].name}</h1>
        <p>
          {hi.common.pts(standings[0].score)} · {reason}
        </p>
      </section>

      <Standings game={game} />

      <section className="panel stack">
        <h2>{hi.results.summary}</h2>
        <div className="stats">
          <div>
            <strong>{game.history.length}</strong>
            <span className="small muted">{hi.results.turns}</span>
          </div>
          <div>
            <strong>{allResults.length}</strong>
            <span className="small muted">{hi.results.cardsPlayed}</span>
          </div>
          <div>
            <strong>{correct}</strong>
            <span className="small muted">{hi.outcome.correct}</span>
          </div>
        </div>
        {best && bestTeam && best.pts > 0 && (
          <p style={{ margin: 0 }}>
            {hi.results.bestTurn}: <strong>{bestTeam.name}</strong> {best.h.describer ? `(${best.h.describer})` : ''} — {hi.common.pts(best.pts)}, {hi.game.round(best.h.round)}
          </p>
        )}
        <details>
          <summary className="label" style={{ cursor: 'pointer' }}>
            {hi.score.history}
          </summary>
          <div style={{ marginTop: 8 }}>
            <TurnHistory game={game} />
          </div>
        </details>
      </section>

      <div className="stack">
        <button type="button" className="btn primary block lg" onClick={rematch}>
          <Icon name="refresh" /> {hi.results.rematch}
        </button>
        <div className="grid-2">
          <button type="button" className="btn secondary" onClick={() => navigate('setup')}>
            {hi.results.newSetup}
          </button>
          <button type="button" className="btn secondary" onClick={() => navigate('home')}>
            <Icon name="home" /> {hi.results.home}
          </button>
        </div>
        <button type="button" className="btn ghost" onClick={() => void share()}>
          <Icon name="share" /> {hi.results.share}
        </button>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </main>
  );
}
