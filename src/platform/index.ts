// Device capabilities behind small interfaces so a native shell (e.g. Capacitor) can swap implementations.
// Every method must be safe to call when the capability is missing.

export type Cue = 'correct' | 'skip' | 'violation' | 'tick' | 'timeUp' | 'start';

export interface Platform {
  haptic(cue: Cue): void;
  sound(cue: Cue): void;
  keepAwake(on: boolean): Promise<void>;
  share(text: string): Promise<'shared' | 'copied' | 'unavailable'>;
}

const VIBRATION: Record<Cue, number | number[]> = {
  correct: 30,
  skip: 15,
  violation: [60, 40, 60],
  tick: 10,
  timeUp: [200, 80, 200],
  start: 40,
};

// Short synthesized tones — no audio files, nothing to license or download.
const TONES: Record<Cue, { f: number[]; d: number; type: OscillatorType; gain: number }> = {
  correct: { f: [660, 880], d: 0.09, type: 'sine', gain: 0.18 },
  skip: { f: [440], d: 0.08, type: 'triangle', gain: 0.12 },
  violation: { f: [180, 140], d: 0.16, type: 'square', gain: 0.08 },
  tick: { f: [1200], d: 0.03, type: 'sine', gain: 0.06 },
  timeUp: { f: [523, 392, 262], d: 0.18, type: 'triangle', gain: 0.18 },
  start: { f: [392, 523], d: 0.1, type: 'sine', gain: 0.15 },
};

export function createWebPlatform(): Platform {
  let ctx: AudioContext | null = null;
  let wakeLock: WakeLockSentinel | null = null;
  let wantAwake = false;

  const audio = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
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
        if (!ac) return;
        if (ac.state === 'suspended') void ac.resume();
        const t = TONES[cue];
        let at = ac.currentTime;
        for (const f of t.f) {
          const osc = ac.createOscillator();
          const g = ac.createGain();
          osc.type = t.type;
          osc.frequency.value = f;
          g.gain.setValueAtTime(t.gain, at);
          g.gain.exponentialRampToValueAtTime(0.0001, at + t.d);
          osc.connect(g).connect(ac.destination);
          osc.start(at);
          osc.stop(at + t.d);
          at += t.d * 0.9;
        }
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
  };
}

export const nullPlatform: Platform = {
  haptic: () => undefined,
  sound: () => undefined,
  keepAwake: async () => undefined,
  share: async () => 'unavailable',
};
