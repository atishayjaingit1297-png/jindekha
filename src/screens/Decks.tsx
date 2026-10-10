import { DECKS, ALL_CARDS } from '../content';
import type { Route } from '../state/router';
import { useT } from '../i18n';
import { TopBar } from '../ui/controls';

export function Decks({ navigate }: { navigate: (r: Route) => void }) {
  const t = useT();
  return (
    <main className="screen">
      <TopBar title={t.decks.title} onBack={() => navigate('home')} />
      <p className="muted" style={{ margin: 0 }}>
        {t.decks.total(ALL_CARDS.length)}
      </p>
      {DECKS.map((d) => (
        <section key={d.id} className="panel stack">
          <h2>{d.title}</h2>
          <p style={{ margin: 0 }}>
            {t.setup.cards(d.cards.length)} · {t.decks.source}: <span lang="en">{d.sourcePdf}</span>
          </p>
          {/* Card list is collapsed so players don't see answers by accident; organisers can review content here. */}
          <details>
            <summary className="label" style={{ cursor: 'pointer', minHeight: 32 }}>
              {t.decks.showAll}
            </summary>
            <div className="deck-cards" style={{ marginTop: 8 }}>
              {d.cards.map((c) => (
                <div key={c.id} lang="hi">
                  <strong>{c.target}</strong>
                  <br />
                  <span className="muted small">{c.forbidden.join(' · ')}</span>
                </div>
              ))}
            </div>
          </details>
        </section>
      ))}
    </main>
  );
}
