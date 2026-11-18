/**
 * Kids' World enhancements, loaded by KidsLayout only (one small external module).
 * Each feature checks for its own elements and does nothing if they are absent; every
 * Kids' World page works without any of this.
 */
import { initBreathing } from './breathing';
import { initFacts, initFlipGroups, initMascot, initPickers } from './games';
import { initToggles } from './toggles';

function run(name: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    console.warn(`[kids:${name}]`, error);
  }
}

run('toggles', initToggles);
run('mascot', initMascot);
run('pickers', initPickers);
run('flips', initFlipGroups);
run('facts', initFacts);
run('breathing', initBreathing);
