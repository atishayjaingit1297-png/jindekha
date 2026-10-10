import { useState } from 'react';
import { DEFAULT_RULES, GameConfigError, LIMITS } from '../core';
import type { Rules } from '../core';
import { DECKS } from '../content';
import { useApp } from '../state/AppContext';
import type { Route } from '../state/router';
import { TEAM_COLORS } from '../persistence/repository';
import type { TeamDraft } from '../persistence/repository';
import { LANGUAGES, useT } from '../i18n';
import { Icon } from '../ui/Icon';
import { Segmented, SettingRow, Stepper, Switch, TopBar } from '../ui/controls';

const TIME_PRESETS = [30, 45, 60, 90, 120];

function localiseDefaultName(name: string, suggestions: string[]): string {
  for (const lang of Object.values(LANGUAGES)) {
    const i = lang.setup.suggestedNames.indexOf(name);
    if (i >= 0) return suggestions[i];
  }
  return name;
}

export function Setup({ navigate }: { navigate: (r: Route, o?: { replace?: boolean }) => void }) {
  const t = useT();
  const { prefs, updatePrefs, startGame } = useApp();
  // Default team names follow the interface language until the players rename them.
  const [teams, setTeams] = useState<TeamDraft[]>(() => prefs.teams.map((team) => ({ ...team, name: localiseDefaultName(team.name, t.setup.suggestedNames) })));
  const [deckIds, setDeckIds] = useState<string[]>(prefs.deckIds?.filter((id) => DECKS.some((d) => d.id === id)) ?? DECKS.map((d) => d.id));
  const [rules, setRules] = useState<Rules>(prefs.rules);
  const [error, setError] = useState<string | null>(null);
  const [playerDrafts, setPlayerDrafts] = useState<string[]>(() => prefs.teams.map(() => ''));

  const setTeam = (i: number, patch: Partial<TeamDraft>) => setTeams((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const setRule = <K extends keyof Rules>(k: K, v: Rules[K]) => setRules((r) => ({ ...r, [k]: v }));

  const addTeam = () => {
    if (teams.length >= LIMITS.teams.max) return;
    const usedColors = new Set(teams.map((x) => x.color));
    const usedNames = new Set(teams.map((x) => x.name));
    setTeams([
      ...teams,
      {
        name: t.setup.suggestedNames.find((n) => !usedNames.has(n)) ?? t.setup.teamFallback(teams.length + 1),
        color: TEAM_COLORS.find((c) => !usedColors.has(c)) ?? TEAM_COLORS[teams.length % TEAM_COLORS.length],
        players: [],
      },
    ]);
    setPlayerDrafts((d) => [...d, '']);
  };
  const removeTeam = (i: number) => {
    if (teams.length <= LIMITS.teams.min) return;
    setTeams(teams.filter((_, j) => j !== i));
    setPlayerDrafts((d) => d.filter((_, j) => j !== i));
  };
  const addPlayer = (i: number) => {
    const name = playerDrafts[i]?.trim();
    if (!name) return;
    setTeam(i, { players: [...teams[i].players, name] });
    setPlayerDrafts((d) => d.map((x, j) => (j === i ? '' : x)));
  };

  const toggleDeck = (id: string) => setDeckIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const totalCards = DECKS.filter((d) => deckIds.includes(d.id)).reduce((n, d) => n + d.cards.length, 0);

  const start = () => {
    const names = teams.map((x) => x.name.trim());
    if (names.some((n) => !n) || new Set(names).size !== names.length) return setError(t.setup.errNames);
    if (deckIds.length === 0) return setError(t.setup.errDecks);
    try {
      updatePrefs({ teams, deckIds, rules });
      startGame({ teams, deckIds, rules });
      navigate('game', { replace: true });
    } catch (e) {
      setError(e instanceof GameConfigError ? e.message : String(e));
    }
  };

  const end = rules.endCondition;

  return (
    <main className="screen">
      <TopBar title={t.setup.title} onBack={() => navigate('home')} />

      <h2 className="section-title">{t.setup.teams}</h2>
      {teams.map((team, i) => (
        <section key={i} className="panel team-edit stack" style={{ ['--c' as string]: team.color }} aria-label={`${t.common.team} ${i + 1}`}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor={`team-${i}`}>
                {t.setup.teamName} {i + 1}
              </label>
              <input
                id={`team-${i}`}
                className="input"
                value={team.name}
                maxLength={24}
                onChange={(e) => {
                  setTeam(i, { name: e.target.value });
                  setError(null);
                }}
              />
            </div>
            {teams.length > LIMITS.teams.min && (
              <button type="button" className="icon-btn" style={{ alignSelf: 'flex-end' }} onClick={() => removeTeam(i)} aria-label={`${t.setup.removeTeam}: ${team.name}`}>
                <Icon name="trash" />
              </button>
            )}
          </div>
          <div className="swatches" role="group" aria-label={t.setup.colors}>
            {TEAM_COLORS.map((c, ci) => (
              <button type="button" key={c} className="swatch" style={{ background: c }} aria-pressed={team.color === c} aria-label={t.setup.color(ci + 1)} onClick={() => setTeam(i, { color: c })} />
            ))}
          </div>
          <details>
            <summary className="label" style={{ cursor: 'pointer', minHeight: 32 }}>
              {t.setup.players} {team.players.length > 0 && `· ${team.players.length}`}
            </summary>
            <p className="muted small" style={{ margin: '4px 0 8px' }}>
              {t.setup.playersHint}
            </p>
            {team.players.length > 0 && (
              <div className="chips" style={{ marginBottom: 8 }}>
                {team.players.map((p, k) => (
                  <span className="chip" key={k}>
                    {p}
                    <button type="button" aria-label={`${t.setup.removePlayer}: ${p}`} onClick={() => setTeam(i, { players: team.players.filter((_, m) => m !== k) })}>
                      <Icon name="close" className="icon" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                addPlayer(i);
              }}
            >
              <input
                className="input"
                aria-label={t.setup.playerName}
                placeholder={t.setup.playerName}
                maxLength={24}
                value={playerDrafts[i] ?? ''}
                onChange={(e) => setPlayerDrafts((d) => d.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button type="submit" className="icon-btn" aria-label={t.setup.addPlayer}>
                <Icon name="plus" />
              </button>
            </form>
          </details>
        </section>
      ))}
      {teams.length === 1 && (
        <p className="muted small" style={{ margin: 0 }}>
          {t.setup.soloHint}
        </p>
      )}
      {teams.length < LIMITS.teams.max && (
        <button type="button" className="btn secondary block" onClick={addTeam}>
          <Icon name="plus" /> {t.setup.addTeam}
        </button>
      )}

      <h2 className="section-title">{t.setup.decks}</h2>
      <div className="stack">
        {DECKS.map((d) => (
          <label key={d.id} className="check-card">
            <input type="checkbox" checked={deckIds.includes(d.id)} onChange={() => toggleDeck(d.id)} />
            <span style={{ flex: 1 }}>
              <strong>{d.title}</strong>
              <br />
              <span className="muted small">{t.setup.cards(d.cards.length)}</span>
            </span>
          </label>
        ))}
        <p className="muted small" style={{ margin: 0 }}>
          {t.setup.totalCards(totalCards)}
        </p>
      </div>

      <h2 className="section-title">{t.setup.rules}</h2>
      <section className="panel stack">
        <div className="field">
          <span className="label">{t.setup.turnTime}</span>
          <Segmented
            label={t.setup.turnTime}
            options={[...new Set([...TIME_PRESETS, rules.turnSeconds])].sort((a, b) => a - b).map((s) => ({ value: s, label: `${s}s` }))}
            value={rules.turnSeconds}
            onChange={(v) => setRule('turnSeconds', v)}
          />
        </div>
        <div className="field">
          <span className="label">{t.setup.endBy}</span>
          <Segmented
            label={t.setup.endBy}
            options={[
              { value: 'rounds', label: t.setup.byRounds },
              { value: 'score', label: t.setup.byScore },
            ]}
            value={end.type}
            onChange={(v) => setRule('endCondition', v === 'rounds' ? { type: 'rounds', rounds: 3 } : { type: 'score', target: 20 })}
          />
        </div>
        {end.type === 'rounds' ? (
          <SettingRow label={t.setup.rounds}>
            <Stepper label={t.setup.rounds} value={end.rounds} min={LIMITS.rounds.min} max={LIMITS.rounds.max} onChange={(v) => setRule('endCondition', { type: 'rounds', rounds: v })} />
          </SettingRow>
        ) : (
          <SettingRow label={t.setup.targetScore}>
            <Stepper
              label={t.setup.targetScore}
              value={end.target}
              min={LIMITS.targetScore.min}
              max={LIMITS.targetScore.max}
              step={5}
              onChange={(v) => setRule('endCondition', { type: 'score', target: v })}
            />
          </SettingRow>
        )}
        <SettingRow label={t.setup.pointsCorrect}>
          <Stepper label={t.setup.pointsCorrect} value={rules.pointsCorrect} min={1} max={LIMITS.points.max} onChange={(v) => setRule('pointsCorrect', v)} />
        </SettingRow>
        <SettingRow label={t.setup.violationPenalty}>
          <Stepper label={t.setup.violationPenalty} value={rules.violationPenalty} min={0} max={LIMITS.points.max} onChange={(v) => setRule('violationPenalty', v)} />
        </SettingRow>
        <SettingRow label={t.setup.violationToOpponents}>
          <Switch label={t.setup.violationToOpponents} checked={rules.violationRecipient === 'opponents'} onChange={(v) => setRule('violationRecipient', v ? 'opponents' : 'none')} />
        </SettingRow>
        <SettingRow label={t.setup.skipPenalty}>
          <Stepper label={t.setup.skipPenalty} value={rules.skipPenalty} min={0} max={LIMITS.points.max} onChange={(v) => setRule('skipPenalty', v)} />
        </SettingRow>
        <SettingRow label={t.setup.maxSkips}>
          <Stepper
            label={t.setup.maxSkips}
            value={rules.maxSkipsPerTurn ?? LIMITS.maxSkips.max + 1}
            min={0}
            max={LIMITS.maxSkips.max + 1}
            format={(v) => (v > LIMITS.maxSkips.max ? '∞' : String(v))}
            onChange={(v) => setRule('maxSkipsPerTurn', v > LIMITS.maxSkips.max ? null : v)}
          />
        </SettingRow>
        <SettingRow label={t.setup.recycleSkipped}>
          <Switch label={t.setup.recycleSkipped} checked={rules.recycleSkipped} onChange={(v) => setRule('recycleSkipped', v)} />
        </SettingRow>
        <button type="button" className="btn ghost" onClick={() => setRules(DEFAULT_RULES)}>
          <Icon name="refresh" /> {t.setup.resetRules}
        </button>
      </section>

      <div className="sticky-bottom stack">
        {error && (
          <div className="banner" role="alert">
            <Icon name="alert" /> {error}
          </div>
        )}
        <button type="button" className="btn primary block lg" onClick={start}>
          <Icon name="play" /> {t.setup.start}
        </button>
      </div>
    </main>
  );
}
