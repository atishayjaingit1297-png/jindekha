import type { GameState, Team } from '../core';
import { getStandings } from '../core';
import { hi } from '../i18n/hi';

export function TeamChip({ team, index }: { team: Team; index?: number }) {
  return (
    <span className="team-chip" style={{ background: team.color }}>
      {index !== undefined && <span className="badge">{index + 1}</span>}
      <span>{team.name}</span>
    </span>
  );
}

export function Standings({ game }: { game: GameState }) {
  const rows = getStandings(game);
  const top = Math.max(1, ...rows.map((r) => Math.abs(r.score)));
  return (
    <ol className="standings" aria-label={hi.score.title}>
      {rows.map((r) => (
        <li key={r.team.id} className={`standing ${r.rank === 1 ? 'leader' : ''}`} style={{ ['--c' as string]: r.team.color }}>
          <span className="rank" aria-label={`स्थान ${r.rank}`}>
            {r.rank}
          </span>
          <span className="name">
            <span className="team-dot" style={{ background: r.team.color }} />
            <span>{r.team.name}</span>
          </span>
          <span className="pts" aria-label={hi.common.pts(r.score)}>
            {r.score}
          </span>
          <span className="bar" style={{ transform: `scaleX(${Math.max(0, r.score) / top})` }} />
        </li>
      ))}
    </ol>
  );
}
