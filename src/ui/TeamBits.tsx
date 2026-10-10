import type { GameState, Team } from '../core';
import { getStandings } from '../core';
import { useT } from '../i18n';

export function TeamChip({ team, index }: { team: Team; index?: number }) {
  return (
    <span className="team-chip" style={{ background: team.color }}>
      {index !== undefined && <span className="badge">{index + 1}</span>}
      <span>{team.name}</span>
    </span>
  );
}

export function Standings({ game }: { game: GameState }) {
  const t = useT();
  const rows = getStandings(game);
  const top = Math.max(1, ...rows.map((r) => Math.abs(r.score)));
  return (
    <ol className="standings" aria-label={t.score.title}>
      {rows.map((r) => (
        <li key={r.team.id} className={`standing ${r.rank === 1 ? 'leader' : ''}`} style={{ ['--c' as string]: r.team.color }}>
          <span className="rank" aria-label={t.score.place(r.rank)}>
            {r.rank}
          </span>
          <span className="name">
            <span className="team-dot" style={{ background: r.team.color }} />
            <span>{r.team.name}</span>
          </span>
          <span className="pts" aria-label={t.common.pts(r.score)}>
            {r.score}
          </span>
          <span className="bar" style={{ transform: `scaleX(${Math.max(0, r.score) / top})` }} />
        </li>
      ))}
    </ol>
  );
}
