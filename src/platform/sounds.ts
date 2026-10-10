// Synthesised game sounds — no audio files to download or license.
// Every cue is built to be loud and easy to tell apart in a noisy room:
// correct = rising bright chime, skip = quick swoosh, violation = low buzzer,
// time up = falling horn, start = double whistle, tick = woodblock, tap = soft click.

export type SoundCue = 'correct' | 'skip' | 'violation' | 'tick' | 'timeUp' | 'start' | 'tap';

type Ctx = AudioContext;

function tone(ctx: Ctx, out: AudioNode, opts: { freq: number; to?: number; type: OscillatorType; start: number; dur: number; gain: number; attack?: number }) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.freq, opts.start);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, opts.start + opts.dur);
  const attack = opts.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, opts.start);
  g.gain.exponentialRampToValueAtTime(opts.gain, opts.start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, opts.start + opts.dur);
  osc.connect(g).connect(out);
  osc.start(opts.start);
  osc.stop(opts.start + opts.dur + 0.02);
}

function noise(ctx: Ctx, out: AudioNode, opts: { start: number; dur: number; gain: number; from: number; to: number }) {
  const len = Math.ceil(ctx.sampleRate * opts.dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(opts.from, opts.start);
  filter.frequency.exponentialRampToValueAtTime(opts.to, opts.start + opts.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, opts.start);
  g.gain.exponentialRampToValueAtTime(opts.gain, opts.start + opts.dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, opts.start + opts.dur);
  src.connect(filter).connect(g).connect(out);
  src.start(opts.start);
  src.stop(opts.start + opts.dur + 0.02);
}

export function playCue(ctx: Ctx, out: AudioNode, cue: SoundCue) {
  const t = ctx.currentTime + 0.01;
  switch (cue) {
    case 'correct':
      // C6–E6–G6 arpeggio with a sparkle on top
      [1046.5, 1318.5, 1568].forEach((f, i) => {
        tone(ctx, out, { freq: f, type: 'triangle', start: t + i * 0.07, dur: 0.32, gain: 0.9 });
        tone(ctx, out, { freq: f * 2, type: 'sine', start: t + i * 0.07, dur: 0.18, gain: 0.25 });
      });
      break;
    case 'skip':
      noise(ctx, out, { start: t, dur: 0.3, gain: 1, from: 700, to: 4500 });
      tone(ctx, out, { freq: 660, to: 330, type: 'square', start: t, dur: 0.18, gain: 0.55 });
      break;
    case 'violation':
      // Two harsh buzzer pulses
      for (const s of [0, 0.22]) {
        tone(ctx, out, { freq: 140, type: 'sawtooth', start: t + s, dur: 0.18, gain: 0.85 });
        tone(ctx, out, { freq: 147, type: 'square', start: t + s, dur: 0.18, gain: 0.45 });
      }
      break;
    case 'timeUp':
      [784, 622, 466].forEach((f, i) => {
        tone(ctx, out, { freq: f, type: 'sawtooth', start: t + i * 0.22, dur: 0.38, gain: 0.55 });
        tone(ctx, out, { freq: f / 2, type: 'triangle', start: t + i * 0.22, dur: 0.38, gain: 0.6 });
      });
      break;
    case 'start':
      tone(ctx, out, { freq: 1760, to: 2350, type: 'sine', start: t, dur: 0.12, gain: 0.8 });
      tone(ctx, out, { freq: 1760, to: 2637, type: 'sine', start: t + 0.16, dur: 0.22, gain: 0.8 });
      break;
    case 'tick':
      tone(ctx, out, { freq: 1900, type: 'square', start: t, dur: 0.05, gain: 0.55 });
      tone(ctx, out, { freq: 950, type: 'sine', start: t, dur: 0.07, gain: 0.5 });
      break;
    case 'tap':
      tone(ctx, out, { freq: 900, to: 650, type: 'triangle', start: t, dur: 0.08, gain: 0.8 });
      break;
  }
}

/** Master chain: a limiter so stacked loud cues stay clean instead of clipping. */
export function createOutput(ctx: Ctx): AudioNode {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.knee.value = 6;
  comp.ratio.value = 12;
  comp.attack.value = 0.002;
  comp.release.value = 0.15;
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(comp).connect(ctx.destination);
  return master;
}
