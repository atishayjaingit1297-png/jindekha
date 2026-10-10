import { useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { useEffectiveTheme } from '../state/useEffectiveTheme';
import type { Route } from '../state/router';
import { useT } from '../i18n';
import { Logo } from '../ui/Logo';
import { Icon } from '../ui/Icon';
import { ConfirmDialog } from '../ui/controls';
import { promptInstall, usePwa } from '../pwa/pwa';
import { ALL_CARDS, DECKS } from '../content';
import { TEAM_COLORS } from '../persistence/repository';

const TONES = ['saffron', 'maroon', 'forest', 'gold'] as const;

/** Real target words from the decks drifting up behind the home screen. Decorative only. */
function FloatingWords() {
  const words = useMemo(() => {
    const pool = [...ALL_CARDS].sort(() => Math.random() - 0.5).slice(0, 14);
    return pool.map((c, i) => ({
      text: c.target,
      left: (i * 41 + 7) % 92,
      size: 0.95 + ((i * 7) % 5) * 0.18,
      duration: 22 + ((i * 5) % 9) * 2.5,
      // Negative delays spread the words over the screen from the very first frame.
      delay: -((i * 3.7) % 24),
      tone: TONES[i % TONES.length],
      tilt: ((i % 5) - 2) * 3,
    }));
  }, []);
  return (
    <div className="floating-words" aria-hidden>
      {words.map((w, i) => (
        <span
          key={i}
          className={`fw ${w.tone}`}
          lang="hi"
          style={{
            left: `${w.left}%`,
            fontSize: `${w.size}rem`,
            animationDuration: `${w.duration}s`,
            animationDelay: `${w.delay}s`,
            ['--tilt' as string]: `${w.tilt}deg`,
          }}
        >
          {w.text}
        </span>
      ))}
    </div>
  );
}

export function Home({ navigate }: { navigate: (r: Route) => void }) {
  const t = useT();
  const { game, prefs, updatePrefs, startGame } = useApp();
  const theme = useEffectiveTheme(prefs.theme);
  const pwa = usePwa();
  const [confirm, setConfirm] = useState<'setup' | 'quick' | null>(null);
  const inProgress = game && game.status !== 'completed';

  // One team, one round, current rules and decks — straight to the first turn.
  const startQuick = () => {
    const decks = prefs.deckIds?.filter((id) => DECKS.some((d) => d.id === id));
    startGame({
      teams: [{ name: t.home.soloTeam, color: TEAM_COLORS[0], players: [] }],
      deckIds: decks?.length ? decks : DECKS.map((d) => d.id),
      rules: { ...prefs.rules, endCondition: { type: 'rounds', rounds: 1 } },
    });
    navigate('game');
  };
  const go = (target: 'setup' | 'quick') => (target === 'setup' ? navigate('setup') : startQuick());
  const request = (target: 'setup' | 'quick') => (inProgress ? setConfirm(target) : go(target));

  return (
    <main className="screen home">
      <FloatingWords />
      <header className="home-top">
        <button
          type="button"
          className="pill-btn"
          onClick={() => updatePrefs({ language: prefs.language === 'hi' ? 'en' : 'hi' })}
          aria-label={t.home.switchLang}
          title={t.home.switchLang}
        >
          <span lang={prefs.language === 'hi' ? 'en' : 'hi'}>{t.home.otherLangShort}</span>
        </button>
        <button
          type="button"
          className="icon-btn theme-btn"
          onClick={() => updatePrefs({ theme: theme === 'dark' ? 'light' : 'dark' })}
          aria-label={theme === 'dark' ? t.home.toLight : t.home.toDark}
          title={theme === 'dark' ? t.home.toLight : t.home.toDark}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} key={theme} />
        </button>
      </header>

      <div className="brand">
        <Logo animated />
        <h1 className="brand-title">{t.appName}</h1>
        <span className="latin">{t.appNameLatin}</span>
        <div className="ornament" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
        <p className="tagline">{t.tagline}</p>
        <p className="muted small intro">{t.intro}</p>
      </div>

      {!pwa.online && (
        <div className="banner" role="status">
          <Icon name="wifiOff" /> {t.home.offline}
        </div>
      )}

      <div className="home-actions">
        {game && (
          <button type="button" className="continue-card" onClick={() => navigate('game')}>
            <Icon name={game.status === 'completed' ? 'trophy' : 'play'} />
            <span>
              <strong>{game.status === 'completed' ? t.game.seeResults : t.home.continue}</strong>
              <span className="small">{t.home.continueMeta(game.round, game.teams.map((x) => x.name).join(' · '))}</span>
            </span>
          </button>
        )}
        <button type="button" className="btn primary block lg shine" onClick={() => request('setup')}>
          <Icon name="plus" /> {t.home.newGame}
        </button>
        <button type="button" className="quick-card" onClick={() => request('quick')}>
          <span className="quick-bolt" aria-hidden>
            <Icon name="bolt" />
          </span>
          <span className="quick-text">
            <strong>{t.home.quickGame}</strong>
            <span className="small">{t.home.quickGameMeta(prefs.rules.turnSeconds)}</span>
          </span>
          <Icon name="play" />
        </button>
        <div className="grid-2">
          <button type="button" className="tile" onClick={() => navigate('rules')}>
            <Icon name="book" />
            {t.home.howTo}
          </button>
          <button type="button" className="tile" onClick={() => navigate('settings')}>
            <Icon name="settings" />
            {t.home.settings}
          </button>
        </div>
        <button type="button" className="btn ghost" onClick={() => navigate('decks')}>
          <Icon name="cards" /> {t.home.decks}
        </button>
        {pwa.canInstall && (
          <div className="banner">
            <Icon name="download" />
            <span className="spacer">{t.home.installHint}</span>
            <button type="button" className="btn primary" onClick={() => void promptInstall()}>
              {t.home.install}
            </button>
          </div>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          message={t.home.discardConfirm}
          confirmLabel={confirm === 'quick' ? t.home.quickGame : t.home.newGame}
          cancelLabel={t.common.cancel}
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            go(confirm);
          }}
        />
      )}
    </main>
  );
}
