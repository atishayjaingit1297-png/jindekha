import { useState } from 'react';
import { useApp } from '../state/AppContext';
import type { Route } from '../state/router';
import { LANGUAGES, useT } from '../i18n';
import type { Language } from '../i18n';
import { ConfirmDialog, Segmented, SettingRow, Switch, Toast, TopBar } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { applyUpdate, usePwa } from '../pwa/pwa';

export function Settings({ navigate }: { navigate: (r: Route) => void }) {
  const t = useT();
  const { prefs, updatePrefs, game, discardGame, cue } = useApp();
  const pwa = usePwa();
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <main className="screen">
      <TopBar title={t.settings.title} onBack={() => navigate('home')} />
      <h2 className="section-title">{t.settings.appearance}</h2>
      <section className="panel stack">
        <div className="field">
          <span className="label">{t.settings.theme}</span>
          <Segmented
            label={t.settings.theme}
            value={prefs.theme}
            onChange={(v) => updatePrefs({ theme: v })}
            options={[
              { value: 'system', label: t.settings.themeSystem, icon: 'monitor' },
              { value: 'light', label: t.settings.themeLight, icon: 'sun' },
              { value: 'dark', label: t.settings.themeDark, icon: 'moon' },
            ]}
          />
        </div>
        <div className="field">
          <span className="label">{t.settings.language}</span>
          <Segmented
            label={t.settings.language}
            value={prefs.language}
            onChange={(v) => updatePrefs({ language: v })}
            options={(Object.keys(LANGUAGES) as Language[]).map((l) => ({ value: l, label: LANGUAGES[l].langName, lang: l }))}
          />
          <p className="muted small" style={{ margin: 0 }}>
            {t.settings.languageNote}
          </p>
        </div>
        <SettingRow label={t.settings.largeText}>
          <Switch label={t.settings.largeText} checked={prefs.largeText} onChange={(v) => updatePrefs({ largeText: v })} />
        </SettingRow>
      </section>

      <h2 className="section-title">{t.settings.gameplay}</h2>
      <section className="panel">
        <SettingRow
          label={
            <>
              {t.settings.music}
              <br />
              <span className="muted small">{t.settings.musicHint}</span>
            </>
          }
        >
          <Switch label={t.settings.music} checked={prefs.music} onChange={(v) => updatePrefs({ music: v })} />
        </SettingRow>
        <SettingRow label={t.settings.sound}>
          <Switch
            label={t.settings.sound}
            checked={prefs.sound}
            onChange={(v) => {
              updatePrefs({ sound: v });
              if (v) setTimeout(() => cue('correct'), 0);
            }}
          />
        </SettingRow>
        <SettingRow label={t.settings.haptics}>
          <Switch label={t.settings.haptics} checked={prefs.haptics} onChange={(v) => updatePrefs({ haptics: v })} />
        </SettingRow>
        <SettingRow label={t.settings.keepAwake}>
          <Switch label={t.settings.keepAwake} checked={prefs.keepAwake} onChange={(v) => updatePrefs({ keepAwake: v })} />
        </SettingRow>
      </section>
      <p className="muted small" style={{ margin: 0 }}>
        {t.settings.defaultRules}
      </p>

      {pwa.needRefresh && (
        <div className="banner">
          <Icon name="download" />
          <span className="spacer">{t.settings.update}</span>
          <button type="button" className="btn primary" onClick={applyUpdate}>
            {t.settings.reload}
          </button>
        </div>
      )}

      {game && (
        <button type="button" className="btn danger-text" onClick={() => setConfirmClear(true)}>
          <Icon name="trash" /> {t.settings.clear}
        </button>
      )}
      <p className="muted small center">
        {t.appName} · {t.settings.version} {__APP_VERSION__}
      </p>

      {confirmClear && (
        <ConfirmDialog
          message={t.settings.clearConfirm}
          confirmLabel={t.common.yes}
          cancelLabel={t.common.cancel}
          danger
          onCancel={() => setConfirmClear(false)}
          onConfirm={async () => {
            setConfirmClear(false);
            await discardGame();
            setToast(t.settings.cleared);
          }}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </main>
  );
}
