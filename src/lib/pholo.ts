/**
 * Pholo, the approved mascot (brief §10b). Builds the inline SVG for one pose, at build time.
 *
 * The artwork is the Foundation's approved files, unchanged:
 * - still poses: src/assets/illustrations/mascot/*.svg (from reference/pholo/still/)
 * - movements:   src/assets/pholo/*.svg            (from reference/pholo/animated/)
 *
 * The movement files use SVG's own animation (SMIL), exactly as approved. Here every animation
 * is changed so that it never starts by itself: each one waits for a hidden "go" trigger, which
 * src/scripts/pholo.ts fires only on its proper event (arriving, a tap, finishing an activity,
 * Start in the Calm corner, read-aloud) and only when motion is allowed. Endless movements
 * (calm breathing, talking) also wait for a "stop" trigger.
 */
import calmMove from '../assets/pholo/calm.svg?raw';
import celebrateMove from '../assets/pholo/celebrate.svg?raw';
import helloMove from '../assets/pholo/hello.svg?raw';
import talkMove from '../assets/pholo/talk.svg?raw';
import thinkingMove from '../assets/pholo/thinking.svg?raw';
import calmStill from '../assets/illustrations/mascot/calm.svg?raw';
import celebrateStill from '../assets/illustrations/mascot/celebrating.svg?raw';
import helloStill from '../assets/illustrations/mascot/hello.svg?raw';
import talkStill from '../assets/illustrations/mascot/talk.svg?raw';
import thinkingStill from '../assets/illustrations/mascot/thinking.svg?raw';

export type PholoPose = 'hello' | 'thinking' | 'celebrate' | 'calm' | 'talk';

/** How long each movement lasts, in milliseconds (0: until stopped). */
export const PHOLO_LENGTH: Record<PholoPose, number> = {
  hello: 6000, // two waves and two bounces; the second blink ends at 6 s
  thinking: 6000,
  celebrate: 3200,
  calm: 0, // until Stop, or leaving the page
  talk: 0, // while the read-aloud audio plays
};

const files: Record<PholoPose, { still: string; move: string }> = {
  hello: { still: helloStill, move: helloMove },
  thinking: { still: thinkingStill, move: thinkingMove },
  celebrate: { still: celebrateStill, move: celebrateMove },
  calm: { still: calmStill, move: calmMove },
  talk: { still: talkStill, move: talkMove },
};

/** The shared viewBox of the movement files: the still pose is shown in it too, so swapping
 * between still and moving never changes Pholo's size or position. */
const VIEWBOX = '-30 -10 260 240';

const inner = (svg: string) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

/** Makes every animation wait for this Pholo's own go (and, if endless, stop) trigger. */
function wait(move: string, uid: string): string {
  return move.replace(
    /<(animate|animateTransform)\b([^>]*?)(\/?)>/g,
    (_m, tag: string, attrs: string, close: string) => {
      let a = attrs;
      const offset = /\sbegin="([\d.]+)s"/.exec(a)?.[1];
      a = a.replace(/\sbegin="[^"]*"/, '');
      a += ` begin="${uid}_go.begin${offset && Number(offset) > 0 ? `+${offset}s` : ''}"`;
      if (/repeatCount="indefinite"/.test(a)) a += ` end="${uid}_stop.begin"`;
      return `<${tag}${a}${close}>`;
    },
  );
}

let count = 0;

/** The two SVGs (still, and moving) for one Pholo. */
export function pholoSvg(pose: PholoPose): { uid: string; still: string; move: string } {
  const uid = `pholo${++count}`;
  const f = files[pose];
  const svg = (body: string, cls: string) =>
    `<svg class="${cls}" viewBox="${VIEWBOX}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
  // The triggers: invisible, no effect of their own
  const triggers = `<g><set id="${uid}_go" attributeName="visibility" to="visible" begin="indefinite" dur="0.01s"/><set id="${uid}_stop" attributeName="visibility" to="visible" begin="indefinite" dur="0.01s"/></g>`;
  return {
    uid,
    still: svg(inner(f.still), 'pholo__still'),
    move: svg(triggers + wait(inner(f.move), uid), 'pholo__move'),
  };
}
