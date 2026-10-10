import { useEffect, useState } from 'react';
import { useApp } from '../../state/AppContext';
import type { Route } from '../../state/router';
import { ReadyView } from './ReadyView';
import { PlayView } from './PlayView';
import { ReviewView } from './ReviewView';
import { RoundSummaryView } from './RoundSummaryView';
import { ResultsView } from './ResultsView';
import { ScoreboardSheet } from './ScoreboardSheet';

export interface GameViewProps {
  navigate: (r: Route, o?: { replace?: boolean }) => void;
  openScoreboard: () => void;
}

export function Game({ navigate }: { navigate: GameViewProps['navigate'] }) {
  const { game, loaded } = useApp();
  const [scoreOpen, setScoreOpen] = useState(false);

  useEffect(() => {
    if (loaded && !game) navigate('home', { replace: true });
  }, [loaded, game, navigate]);

  if (!game) return null;
  const props: GameViewProps = { navigate, openScoreboard: () => setScoreOpen(true) };

  return (
    <>
      {game.status === 'ready' && <ReadyView {...props} />}
      {(game.status === 'active' || game.status === 'paused') && <PlayView {...props} />}
      {game.status === 'review' && <ReviewView {...props} />}
      {game.status === 'round_summary' && <RoundSummaryView {...props} />}
      {game.status === 'completed' && <ResultsView {...props} />}
      {scoreOpen && <ScoreboardSheet game={game} onClose={() => setScoreOpen(false)} />}
    </>
  );
}
