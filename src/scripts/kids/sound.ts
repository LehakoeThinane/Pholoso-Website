/**
 * Tap sounds for Kids' World. Off by default; they play only in direct response to a tap,
 * and only after a child (or grown-up) turns Sounds on. Nothing ever plays by itself.
 *
 * The sounds are short, soft tones made by the browser (Web Audio), so there are no sound
 * files to download. To use recorded sounds later, replace play() and keep its checks.
 */
import { soundOn } from './state';

type Kind = 'tap' | 'flip' | 'yay';

const NOTES: Record<Kind, number[]> = {
  tap: [523.25], // C5
  flip: [659.25], // E5
  yay: [523.25, 659.25, 783.99], // C5 E5 G5, a little rising chord
};

let ctx: AudioContext | undefined;

export function play(kind: Kind): void {
  if (!soundOn()) return;
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  try {
    ctx ??= new Ctx();
    const start = ctx.currentTime;
    NOTES[kind].forEach((freq, i) => {
      const t = start + i * 0.09;
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Soft: a quick fade in and out, well below full volume
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    // No sound is fine; nothing depends on it.
  }
}
