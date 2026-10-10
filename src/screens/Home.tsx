import { useState } from 'react';
import { useApp } from '../state/AppContext';
import type { Route } from '../state/router';
import { hi } from '../i18n/hi';
import { Logo } from '../ui/Logo';
import { Icon } from '../ui/Icon';
import { ConfirmDialog } from '../ui/controls';
import { promptInstall, usePwa } from '../pwa/pwa';

export function Home({ navigate }: { navigate: (r: Route) => void }) {
  const { game } = useApp();
  const pwa = usePwa();
  const [confirmNew, setConfirmNew] = useState(false);
  const inProgress = game && game.status !== 'completed';

  const onNew = () => (inProgress ? setConfirmNew(true) : navigate('setup'));

  return (
    <main className="screen">
      <div className="brand">
        <Logo />
        <h1>{hi.appName}</h1>
        <span className="latin">{hi.appNameLatin}</span>
        <div className="ornament" aria-hidden />
        <p className="tagline">{hi.tagline}</p>
        <p className="muted small" style={{ maxWidth: 380, margin: 0 }}>
          {hi.intro}
        </p>
      </div>

      {!pwa.online && (
        <div className="banner" role="status">
          <Icon name="wifiOff" /> {hi.home.offline}
        </div>
      )}

      <div className="home-actions">
        {game && (
          <button type="button" className="continue-card" onClick={() => navigate('game')}>
            <Icon name={game.status === 'completed' ? 'trophy' : 'play'} />
            <span>
              <strong>{game.status === 'completed' ? hi.game.seeResults : hi.home.continue}</strong>
              <span className="small">{hi.home.continueMeta(game.round, game.teams.map((t) => t.name).join(' · '))}</span>
            </span>
          </button>
        )}
        <button type="button" className="btn primary block lg" onClick={onNew}>
          <Icon name="plus" /> {hi.home.newGame}
        </button>
        <div className="grid-2">
          <button type="button" className="tile" onClick={() => navigate('rules')}>
            <Icon name="book" />
            {hi.home.howTo}
          </button>
          <button type="button" className="tile" onClick={() => navigate('settings')}>
            <Icon name="settings" />
            {hi.home.settings}
          </button>
        </div>
        <button type="button" className="btn ghost" onClick={() => navigate('decks')}>
          <Icon name="cards" /> {hi.home.decks}
        </button>
        {pwa.canInstall && (
          <div className="banner">
            <Icon name="download" />
            <span className="spacer">{hi.home.installHint}</span>
            <button type="button" className="btn primary" onClick={() => void promptInstall()}>
              {hi.home.install}
            </button>
          </div>
        )}
      </div>

      {confirmNew && (
        <ConfirmDialog
          message={hi.home.discardConfirm}
          confirmLabel={hi.home.newGame}
          cancelLabel={hi.common.cancel}
          danger
          onCancel={() => setConfirmNew(false)}
          onConfirm={() => {
            setConfirmNew(false);
            navigate('setup');
          }}
        />
      )}
    </main>
  );
}
