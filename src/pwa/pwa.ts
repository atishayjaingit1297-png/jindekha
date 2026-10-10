import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  needRefresh: boolean;
  offlineReady: boolean;
  online: boolean;
  canInstall: boolean;
}

let state: PwaState = {
  needRefresh: false,
  offlineReady: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  canInstall: false,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<PwaState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
let installEvent: BeforeInstallPromptEvent | null = null;

export async function initPwa() {
  window.addEventListener('online', () => set({ online: true }));
  window.addEventListener('offline', () => set({ online: false }));
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e as BeforeInstallPromptEvent;
    set({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => set({ canInstall: false }));
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const { registerSW } = await import('virtual:pwa-register');
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => set({ needRefresh: true }),
    onOfflineReady: () => set({ offlineReady: true }),
  });
}

export function applyUpdate() {
  void updateSW?.(true);
}

export async function promptInstall() {
  if (!installEvent) return;
  await installEvent.prompt();
  installEvent = null;
  set({ canInstall: false });
}

export function dismissOfflineReady() {
  set({ offlineReady: false });
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
