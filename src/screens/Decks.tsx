import { DECKS, ALL_CARDS } from '../content';
import type { Route } from '../state/router';
import { hi } from '../i18n/hi';
import { TopBar } from '../ui/controls';

export function Decks({ navigate }: { navigate: (r: Route) => void }) {
  return (
    <main className="screen">
      <TopBar title={hi.decks.title} onBack={() => navigate('home')} />
      <p className="muted" style={{ margin: 0 }}>
        {hi.decks.total(ALL_CARDS.length)}
      </p>
      {DECKS.map((d) => (
        <section key={d.id} className="panel stack">
          <h2>{d.title}</h2>
          <p style={{ margin: 0 }}>
            {hi.setup.cards(d.cards.length)} · {hi.decks.source}: <span lang="en">{d.sourcePdf}</span>
          </p>
          {/* Card list is collapsed so players don't see answers by accident; organisers can review content here. */}
          <details>
            <summary className="label" style={{ cursor: 'pointer', minHeight: 32 }}>
              सभी कार्ड देखें (आयोजकों के लिए — खिलाड़ी न देखें)
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
