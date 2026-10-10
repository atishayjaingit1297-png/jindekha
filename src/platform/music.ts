// Background music: one looping track that plays outside gameplay and resumes where it stopped.

export interface MusicPlayer {
  /** True while the app wants music (menus, results); false during a game or when the player turned it off. */
  setActive(active: boolean): void;
}

export const nullMusic: MusicPlayer = { setActive: () => undefined };

const POSITION_KEY = 'jindekha.music.position';
const VOLUME = 0.45;
const FADE_MS = 600;

function readPosition(): number {
  try {
    return Number(localStorage.getItem(POSITION_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writePosition(seconds: number) {
  try {
    localStorage.setItem(POSITION_KEY, String(Math.floor(seconds)));
  } catch {
    /* storage unavailable */
  }
}

export function createMusicPlayer(src: string): MusicPlayer {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return nullMusic;

  let el: HTMLAudioElement | null = null;
  let active = false;
  let fadeTimer: number | undefined;
  let waitingForGesture = false;

  const element = () => {
    if (el) return el;
    el = new Audio();
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    el.src = src;
    const start = readPosition();
    if (start > 0) el.addEventListener('loadedmetadata', () => el && (el.currentTime = Math.min(start, (el.duration || start + 1) - 1)), { once: true });
    el.addEventListener('timeupdate', () => el && writePosition(el.currentTime));
    // Fetch the whole file once so the service worker can keep it for offline play.
    void fetch(src).catch(() => undefined);
    return el;
  };

  const fadeTo = (target: number, then?: () => void) => {
    const a = el;
    if (!a) return;
    window.clearInterval(fadeTimer);
    const steps = Math.max(1, Math.round(FADE_MS / 40));
    const from = a.volume;
    let i = 0;
    fadeTimer = window.setInterval(() => {
      i++;
      try {
        a.volume = Math.min(1, Math.max(0, from + ((target - from) * i) / steps));
      } catch {
        /* iOS ignores volume changes */
      }
      if (i >= steps) {
        window.clearInterval(fadeTimer);
        then?.();
      }
    }, 40);
  };

  // Browsers only allow sound after the user has interacted with the page.
  const onGesture = () => {
    waitingForGesture = false;
    window.removeEventListener('pointerdown', onGesture, true);
    window.removeEventListener('keydown', onGesture, true);
    if (active && document.visibilityState === 'visible') start();
  };

  const start = () => {
    const a = element();
    const p = a.play();
    if (p && typeof p.then === 'function') {
      p.then(() => fadeTo(VOLUME)).catch(() => {
        if (waitingForGesture) return;
        waitingForGesture = true;
        window.addEventListener('pointerdown', onGesture, true);
        window.addEventListener('keydown', onGesture, true);
      });
    }
  };

  const stop = () => {
    if (!el || el.paused) return;
    const a = el;
    fadeTo(0, () => {
      a.pause();
      writePosition(a.currentTime);
    });
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stop();
    else if (active) start();
  });

  return {
    setActive(next) {
      if (next === active) return;
      active = next;
      if (active && document.visibilityState === 'visible') start();
      else stop();
    },
  };
}
