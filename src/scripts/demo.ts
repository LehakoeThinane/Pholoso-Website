/**
 * Parent Guide demo (components/guide/GuideDemo.astro). Plays only when someone presses
 * "Play demo", and only when motion is allowed (otherwise every step is already shown).
 * "Turn off motion" stops it and shows every step at once.
 */
export function initDemo(): void {
  document.querySelectorAll<HTMLElement>('[data-demo]').forEach((demo) => {
    const steps = [...demo.querySelectorAll<HTMLElement>('[data-demo-step]')];
    const pick = demo.querySelector<HTMLElement>('[data-demo-pick]');
    const play = demo.querySelector<HTMLButtonElement>('[data-demo-play]');
    const still = demo.querySelector<HTMLButtonElement>('[data-demo-still]');
    if (!play || !still) return;
    let timers: number[] = [];

    const show = (n: number) => steps.forEach((s, i) => s.classList.toggle('is-on', i < n));
    const stop = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
    const finish = () => {
      stop();
      show(steps.length);
      pick?.classList.add('is-picked');
      still.hidden = true;
      play.textContent = 'Replay';
    };

    play.addEventListener('click', () => {
      stop();
      show(1);
      pick?.classList.remove('is-picked');
      still.hidden = false;
      play.textContent = 'Replay';
      timers = [
        window.setTimeout(() => pick?.classList.add('is-picked'), 800),
        window.setTimeout(() => show(2), 1500),
        window.setTimeout(() => show(3), 2700),
        window.setTimeout(finish, 2800),
      ];
    });
    still.addEventListener('click', () => {
      finish();
      play.focus();
    });
  });
}
