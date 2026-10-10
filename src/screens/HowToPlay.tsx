import { useApp } from '../state/AppContext';
import type { Route } from '../state/router';
import { Rich, useT } from '../i18n';
import { TopBar } from '../ui/controls';
import { ALL_CARDS } from '../content';

export function HowToPlay({ navigate }: { navigate: (r: Route) => void }) {
  const t = useT();
  const h = t.howTo;
  const { prefs } = useApp();
  const r = prefs.rules;
  const example = ALL_CARDS.find((c) => c.id === 'jt1-019') ?? ALL_CARDS[0];
  const end = r.endCondition;

  return (
    <main className="screen">
      <TopBar title={t.home.howTo} backLabel={t.common.back} onBack={() => navigate('home')} />
      <article className="panel prose">
        <h2>{h.gistTitle}</h2>
        <p>
          <Rich text={h.gist} />
        </p>
        {example && (
          <div className="demo-card" aria-label={h.exampleCard}>
            <b lang="hi">{example.target}</b>
            {example.forbidden.map((w) => (
              <span key={w} lang="hi">
                {w}
              </span>
            ))}
          </div>
        )}
        <h2>{h.turnTitle}</h2>
        <ol>
          {h.steps.map((s) => (
            <li key={s}>
              <Rich text={s} />
            </li>
          ))}
        </ol>
        <h2>{h.rulesTitle}</h2>
        <ul>
          <li>{h.ruleTurn(r.turnSeconds)}</li>
          <li>{h.ruleCorrect(r.pointsCorrect)}</li>
          <li>{h.ruleViolation(r.violationPenalty, r.violationRecipient === 'opponents')}</li>
          <li>{h.ruleSkip(r.skipPenalty, r.maxSkipsPerTurn)}</li>
          <li>{h.ruleRecycle(r.recycleSkipped)}</li>
          <li>{end.type === 'rounds' ? h.ruleEndRounds(end.rounds) : h.ruleEndScore(end.target)}</li>
          <li>{h.ruleTimeout}</li>
          <li>{h.rulePause}</li>
        </ul>
        <p className="muted small">{h.note}</p>
      </article>
      <button type="button" className="btn primary block" onClick={() => navigate('setup')}>
        {t.home.newGame}
      </button>
    </main>
  );
}
