import { useEffect } from 'react';
import { useApp } from './state/AppContext';
import { useRoute } from './state/router';
import { Home } from './screens/Home';
import { Setup } from './screens/Setup';
import { HowToPlay } from './screens/HowToPlay';
import { Settings } from './screens/Settings';
import { Decks } from './screens/Decks';
import { Game } from './screens/game/Game';
import { applyUpdate, dismissOfflineReady, usePwa } from './pwa/pwa';
import { useT } from './i18n';
import { Toast } from './ui/controls';
import { Logo } from './ui/Logo';

export function App() {
  const t = useT();
  const { loaded, game, dispatch } = useApp();
  const [route, navigate] = useRoute();
  const pwa = usePwa();

  // Leaving the game screen mid-turn pauses the clock.
  useEffect(() => {
    if (route !== 'game' && game?.status === 'active') dispatch({ type: 'PAUSE', now: Date.now() });
  }, [route, game?.status, dispatch]);

  if (!loaded) {
    return (
      <div className="app" aria-busy="true">
        <div className="brand">
          <Logo />
        </div>
      </div>
    );
  }

  const playing = route === 'game' && (game?.status === 'active' || game?.status === 'paused');

  return (
    <div className={`app ${route === 'decks' ? 'wide' : ''}`} style={playing ? { height: '100dvh', overflow: 'hidden' } : undefined}>
      {route === 'home' && <Home navigate={navigate} />}
      {route === 'setup' && <Setup navigate={navigate} />}
      {route === 'rules' && <HowToPlay navigate={navigate} />}
      {route === 'settings' && <Settings navigate={navigate} />}
      {route === 'decks' && <Decks navigate={navigate} />}
      {route === 'game' && <Game navigate={navigate} />}

      {pwa.needRefresh && !playing && route !== 'settings' && (
        <div className="toast" role="status" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {t.settings.update}
          <button type="button" className="btn primary" style={{ minHeight: 36, padding: '4px 12px' }} onClick={applyUpdate}>
            {t.settings.reload}
          </button>
        </div>
      )}
      {pwa.offlineReady && !playing && <Toast message={t.settings.offlineReady} onDone={dismissOfflineReady} />}
    </div>
  );
}
