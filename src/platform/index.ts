// Device capabilities behind small interfaces so a native shell (e.g. Capacitor) can swap implementations.
// Every method must be safe to call when the capability is missing.
import { createOutput, playCue } from './sounds';
import type { SoundCue } from './sounds';
import { createMusicPlayer, nullMusic } from './music';
import type { MusicPlayer } from './music';

export type Cue = SoundCue;
export type { MusicPlayer };

export interface Platform {
  haptic(cue: Cue): void;
  sound(cue: Cue): void;
  keepAwake(on: boolean): Promise<void>;
  share(text: string): Promise<'shared' | 'copied' | 'unavailable'>;
  music: MusicPlayer;
}

const VIBRATION: Record<Cue, number | number[]> = {
  correct: 60,
  skip: 30,
  violation: [120, 60, 120],
  tick: 15,
  timeUp: [250, 100, 250],
  start: 50,
  tap: 12,
};

export function createWebPlatform(musicSrc = `${import.meta.env.BASE_URL}audio/background.mp3`): Platform {
  let ctx: AudioContext | null = null;
  let out: AudioNode | null = null;
  let wakeLock: WakeLockSentinel | null = null;
  let wantAwake = false;

  const audio = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    out = createOutput(ctx);
    return ctx;
  };

  // A wake lock is released when the page is hidden; take it again on return.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && wantAwake && !wakeLock) void acquire();
    });
  }
  async function acquire() {
    try {
      if (!('wakeLock' in navigator)) return;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } catch {
      wakeLock = null;
    }
  }

  return {
    haptic(cue) {
      try {
        navigator.vibrate?.(VIBRATION[cue]);
      } catch {
        /* unsupported (e.g. iOS Safari) */
      }
    },
    sound(cue) {
      try {
        const ac = audio();
        if (!ac || !out) return;
        if (ac.state === 'suspended') void ac.resume();
        playCue(ac, out, cue);
      } catch {
        /* audio not available */
      }
    },
    async keepAwake(on) {
      wantAwake = on;
      if (on && !wakeLock) await acquire();
      if (!on && wakeLock) {
        await wakeLock.release().catch(() => undefined);
        wakeLock = null;
      }
    },
    async share(text) {
      try {
        if (navigator.share) {
          await navigator.share({ text });
          return 'shared';
        }
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          return 'copied';
        }
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return 'shared';
      }
      return 'unavailable';
    },
    music: createMusicPlayer(musicSrc),
  };
}

export const nullPlatform: Platform = {
  haptic: () => undefined,
  sound: () => undefined,
  keepAwake: async () => undefined,
  share: async () => 'unavailable',
  music: nullMusic,
};
