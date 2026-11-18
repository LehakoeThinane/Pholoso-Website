/**
 * Shared Kids' World checks. The <html> attributes are set by public/prefs.js from the
 * visitor's saved Comfort & access settings and their device preferences.
 */
const root = document.documentElement;

/**
 * Celebrations, the mascot's wave and the breathing shape run only when this is true:
 * the device does not ask for reduced motion, and Reduce motion, Calm colours and
 * Simplified page are all off.
 */
export function motionAllowed(): boolean {
  return root.dataset.anim === 'on'; // set by public/prefs.js, the same flag the CSS uses
}

/** Sounds are on only when a child turned them on, and never with Calm colours. */
export function soundOn(): boolean {
  return root.dataset.sound === 'on';
}
