import { useState } from 'react';
import { useApp } from '../state/AppContext';
import type { Route } from '../state/router';
import { hi } from '../i18n/hi';
import { ConfirmDialog, SettingRow, Switch, Toast, TopBar } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { applyUpdate, usePwa } from '../pwa/pwa';

export function Settings({ navigate }: { navigate: (r: Route) => void }) {
  const { prefs, updatePrefs, game, discardGame, cue } = useApp();
  const pwa = usePwa();
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <main className="screen">
      <TopBar title={hi.settings.title} onBack={() => navigate('home')} />
      <section className="panel">
        <SettingRow label={hi.settings.sound}>
          <Switch
            label={hi.settings.sound}
            checked={prefs.sound}
            onChange={(v) => {
              updatePrefs({ sound: v });
              if (v) setTimeout(() => cue('correct'), 0);
            }}
          />
        </SettingRow>
        <SettingRow label={hi.settings.haptics}>
          <Switch label={hi.settings.haptics} checked={prefs.haptics} onChange={(v) => updatePrefs({ haptics: v })} />
        </SettingRow>
        <SettingRow label={hi.settings.keepAwake}>
          <Switch label={hi.settings.keepAwake} checked={prefs.keepAwake} onChange={(v) => updatePrefs({ keepAwake: v })} />
        </SettingRow>
        <SettingRow label={hi.settings.largeText}>
          <Switch label={hi.settings.largeText} checked={prefs.largeText} onChange={(v) => updatePrefs({ largeText: v })} />
        </SettingRow>
      </section>
      <p className="muted small" style={{ margin: 0 }}>
        {hi.settings.defaultRules}
      </p>

      {pwa.needRefresh && (
        <div className="banner">
          <Icon name="download" />
          <span className="spacer">{hi.settings.update}</span>
          <button type="button" className="btn primary" onClick={applyUpdate}>
            {hi.settings.reload}
          </button>
        </div>
      )}

      {game && (
        <button type="button" className="btn danger-text" onClick={() => setConfirmClear(true)}>
          <Icon name="trash" /> {hi.settings.clear}
        </button>
      )}
      <p className="muted small center">
        {hi.appName} · {hi.settings.version} {__APP_VERSION__}
      </p>

      {confirmClear && (
        <ConfirmDialog
          message={hi.settings.clearConfirm}
          confirmLabel={hi.common.yes}
          cancelLabel={hi.common.cancel}
          danger
          onCancel={() => setConfirmClear(false)}
          onConfirm={async () => {
            setConfirmClear(false);
            await discardGame();
            setToast(hi.settings.cleared);
          }}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </main>
  );
}
