/**
 * Parent Coach chat screen (src/pages/parent-coach/chat.astro).
 *
 * - The session has its own address (?s=<id>), so reloading keeps the conversation.
 *   Practice mode keeps it in this browser tab only (sessionStorage); Stage 2 keeps it on the
 *   server, deleted after 30 days unless the parent saves it.
 * - The first answers are big buttons; later suggestions are chips above the message box.
 * - Keyboard focus stays in the message box after a reply. Replies appear block by block when
 *   motion is allowed, all at once otherwise; the log is marked busy until a reply is complete,
 *   so screen readers announce it once.
 * - Danger words stop the coaching and show "Need help now?" (checked before anything is sent).
 */
import { guide } from '../../config/guide';
import { announce } from '../announce';
import { toggleSpeech } from '../listen';
import { h, renderBlock } from './blocks';
import type { Block, Message, Profile, Reply, Session, Strategy } from './types';

type Engine = typeof import('./mock');

const PROFILE = 'pholoso-coach-profile';
const SESSION = 'pholoso-coach-session-';

const store = {
  get<T>(key: string): T | null {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? 'null') as T | null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Storage blocked: the conversation still works until the page is closed. */
    }
  },
  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* nothing to do */
    }
  },
};

const crisis = new RegExp(
  `(^|[^\\p{L}])(${guide.crisisWords.map((w) => w.replace(/-/g, '[- ]?')).join('|')})([^\\p{L}]|$)`,
  'iu',
);
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const animated = () => document.documentElement.hasAttribute('data-anim');

export async function initCoach(): Promise<void> {
  const root = document.querySelector<HTMLElement>('[data-coach]');
  if (!root || root.dataset.mode === 'off') return;
  const log = root.querySelector<HTMLElement>('[data-coach-log]')!;
  const chips = root.querySelector<HTMLUListElement>('[data-coach-chips]')!;
  const form = root.querySelector<HTMLFormElement>('[data-coach-composer]')!;
  const input = form.querySelector('textarea')!;
  const send = root.querySelector<HTMLButtonElement>('[data-coach-send]')!;
  const dock = root.querySelector<HTMLElement>('[data-coach-dock]')!;
  const thinking = root.querySelector<HTMLElement>('[data-coach-thinking]')!;
  const jump = root.querySelector<HTMLAnchorElement>('[data-coach-jump]');
  const greet = root.querySelector<HTMLElement>('[data-coach-greet]');
  const template = (sel: string) =>
    (root
      .querySelector<HTMLTemplateElement>(sel)
      ?.content.firstElementChild?.cloneNode(true) as HTMLElement) ?? null;
  const art = (id: string) => template(`template[data-coach-art="${id}"]`);

  // Practice mode: the engine and the (draft) library. Stage 2 replaces this with the API.
  let engine: Engine;
  let strategies: Strategy[];
  try {
    [engine, strategies] = await Promise.all([
      import('./mock'),
      fetch('/parent-coach/strategies.json')
        .then((r) => r.json() as Promise<{ strategies: Strategy[] }>)
        .then((d) => d.strategies),
    ]);
  } catch {
    log.append(
      h(
        'p',
        { class: 'cblock cblock--text' },
        'Sorry, the coach could not start. Please reload the page.',
      ),
    );
    return;
  }

  /* ---------- The session ---------- */
  const params = new URLSearchParams(location.search);
  let session = params.get('s') ? store.get<Session>(SESSION + params.get('s')) : null;
  if (!session) {
    const profile = store.get<Profile>(PROFILE);
    if (!profile) {
      location.replace('/parent-coach/start/');
      return;
    }
    session = {
      id: crypto.randomUUID(),
      profile,
      child: 0,
      stage: profile.children.length > 1 ? 'pick_child' : 'ask',
      memory: {},
      messages: [],
      choices: [],
      placeholder: '',
      ended: false,
    };
    const first = engine.opening(session);
    session.messages.push({ role: 'coach', blocks: first.blocks });
    session.choices = first.choices;
    session.placeholder = first.placeholder;
    history.replaceState(null, '', `?s=${session.id}`);
  }
  const s: Session = session;
  const save = () => store.set(SESSION + s.id, s);
  save();
  if (greet && s.profile.parent) greet.textContent = `, ${s.profile.parent}`;

  /* ---------- Drawing ---------- */
  let count = 0;
  const actions = () =>
    h(
      'div',
      { class: 'cmsg__actions', role: 'group', 'aria-label': 'Message actions' },
      h(
        'button',
        { type: 'button', class: 'cact', 'data-act': 'good', 'aria-pressed': 'false' },
        h('span', { 'aria-hidden': 'true' }, '👍'),
        ' Good response',
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'cact',
          'data-act': 'bad',
          'aria-pressed': 'false',
          'aria-expanded': 'false',
        },
        h('span', { 'aria-hidden': 'true' }, '👎'),
        ' Bad response',
      ),
      h(
        'button',
        { type: 'button', class: 'cact', 'data-act': 'copy', 'data-copy-only': '' },
        h('span', { 'aria-hidden': 'true' }, '⧉'),
        ' Copy text',
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'cact',
          'data-act': 'listen',
          'aria-pressed': 'false',
          'data-speech-only': '',
        },
        h('span', { 'aria-hidden': 'true' }, '▶'),
        ' Listen',
      ),
    );

  async function drawCoach(blocks: Block[], animate: boolean): Promise<HTMLElement> {
    const id = `coach-msg-${++count}`;
    const body = h('div', { class: 'cmsg__body' });
    const msg = h(
      'div',
      { class: 'cmsg cmsg--coach', id, 'data-msg': '' },
      h('p', { class: 'visually-hidden' }, 'Coach:'),
      body,
    );
    log.append(msg);
    log.setAttribute('aria-busy', 'true');
    for (const b of blocks) {
      body.append(renderBlock(b, art));
      if (animate) {
        msg.scrollIntoView({ block: 'nearest' });
        await wait(250);
      }
    }
    if (!blocks.some((b) => b.type === 'closing' || b.type === 'account_prompt'))
      msg.append(actions());
    log.setAttribute('aria-busy', 'false');
    if (jump) jump.href = `#${id}`;
    return msg;
  }
  const drawParent = (text: string) =>
    log.append(
      h(
        'div',
        { class: 'cmsg cmsg--parent' },
        h('p', { class: 'visually-hidden' }, 'You:'),
        h('p', {}, text),
      ),
    );

  /** First question: big buttons in the conversation. Later: chips above the message box. */
  function drawChoices(): void {
    log.querySelector('[data-coach-big]')?.remove();
    chips.replaceChildren();
    const big = s.messages.length === 1;
    const list = big
      ? h('ul', { class: 'cbig', 'data-coach-big': '', 'aria-label': 'Suggested answers' })
      : chips;
    for (const c of s.choices)
      list.append(
        h(
          'li',
          {},
          h(
            'button',
            { type: 'button', class: big ? 'cbig__button' : 'cchip', 'data-choice': c },
            c,
          ),
        ),
      );
    if (big && s.choices.length) log.append(list);
    chips.hidden = big || !s.choices.length;
    input.placeholder = s.placeholder;
  }

  function end(): void {
    dock.hidden = true;
    chips.replaceChildren();
  }

  // Restore what is already in the session (a reload), without animation
  for (const m of s.messages as Message[]) {
    if (m.role === 'parent') drawParent(m.text ?? '');
    else if (m.blocks) await drawCoach(m.blocks, false);
    else if (m.role === 'coach') log.append(template('template[data-coach-help]')!);
  }
  if (s.ended) end();
  else drawChoices();
  const rated = log.querySelector<HTMLInputElement>(`[data-coach-rate][value="${s.rating ?? 0}"]`);
  if (rated) rated.checked = true;

  /* ---------- Sending ---------- */
  let busy = false;
  async function answer(text: string): Promise<void> {
    if (busy || !text.trim() || s.ended) return;
    busy = true;
    text = text.trim();
    log.querySelector('[data-coach-big]')?.remove();
    chips.replaceChildren();
    chips.hidden = true;
    drawParent(text);
    s.messages.push({ role: 'parent', text });

    if (crisis.test(text)) {
      // Stop coaching: nothing is sent, and the parent sees where to get help now
      log.append(template('template[data-coach-help]')!);
      s.messages.push({ role: 'coach' });
      s.ended = true;
      end();
      save();
      busy = false;
      return;
    }

    send.setAttribute('aria-busy', 'true');
    thinking.hidden = false;
    await wait(animated() ? 700 : 150);
    const r: Reply = engine.respond(s, text, strategies);
    thinking.hidden = true;
    send.removeAttribute('aria-busy');
    s.stage = r.next_stage;
    s.choices = r.choices;
    s.placeholder = r.placeholder;
    s.messages.push({ role: 'coach', blocks: r.blocks });
    save();
    await drawCoach(r.blocks, animated());
    drawChoices();
    busy = false;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = '';
    void answer(text);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // Chips: arrow keys move along the row
  chips.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const all = [...chips.querySelectorAll<HTMLButtonElement>('button')];
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length]?.focus();
  });

  root.addEventListener('click', (e) => {
    const button = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!button) return;
    const msg = button.closest<HTMLElement>('[data-msg]');
    if (button.dataset.choice) {
      void answer(button.dataset.choice).then(() => input.focus());
      return;
    }
    if (button.hasAttribute('data-coach-skip')) {
      button.disabled = true;
      const child = s.profile.children[s.child]?.name || 'your child';
      const r = engine.closing(child);
      s.stage = 'done';
      s.ended = true;
      s.messages.push({ role: 'coach', blocks: r.blocks });
      save();
      end();
      void drawCoach(r.blocks, false).then((m) =>
        m
          .querySelector<HTMLElement>('legend')
          ?.closest('fieldset')
          ?.querySelector('input')
          ?.focus(),
      );
      return;
    }
    if (button.hasAttribute('data-coach-restart')) {
      store.remove(SESSION + s.id);
      location.href = '/parent-coach/chat/';
      return;
    }
    const act = button.dataset.act;
    if (act === 'good') {
      const on = button.getAttribute('aria-pressed') !== 'true';
      msg?.querySelector('[data-act="bad"]')?.setAttribute('aria-pressed', 'false');
      msg?.querySelector('[data-coach-feedback]')?.remove();
      button.setAttribute('aria-pressed', String(on));
      if (on) announce('Thank you for the feedback.');
    } else if (act === 'bad') {
      const on = button.getAttribute('aria-pressed') !== 'true';
      msg?.querySelector('[data-act="good"]')?.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-expanded', String(on));
      msg?.querySelector('[data-coach-feedback]')?.remove();
      if (on && msg) {
        const form = feedbackForm(msg.id);
        msg.append(form);
        form.querySelector('input')?.focus();
      }
    } else if (act === 'copy') {
      const text = msg?.querySelector<HTMLElement>('.cmsg__body')?.innerText.trim() ?? '';
      navigator.clipboard.writeText(text).then(
        () => announce('Message copied'),
        () => announce('Could not copy. Please select the text and copy it yourself.'),
      );
    } else if (act === 'listen') {
      const body = msg?.querySelector<HTMLElement>('.cmsg__body');
      if (body) toggleSpeech(button, body);
    } else if (button.hasAttribute('data-coach-feedback-send')) {
      const f = button.closest('[data-coach-feedback]');
      f?.replaceWith(
        h(
          'p',
          { class: 'cmsg__thanks', role: 'status' },
          'Thank you. Your feedback helps us improve the coach.',
        ),
      );
    }
  });

  root.addEventListener('change', (e) => {
    const radio = (e.target as Element).closest<HTMLInputElement>('[data-coach-rate]');
    if (!radio) return;
    s.rating = Number(radio.value);
    save();
    announce(`Thank you. You gave this session ${radio.value} out of 5.`);
  });

  function feedbackForm(msgId: string): HTMLElement {
    const reasons = JSON.parse(root!.dataset.reasons ?? '[]') as string[];
    return h(
      'div',
      { class: 'cmsg__feedback', 'data-coach-feedback': '' },
      h(
        'fieldset',
        {},
        h('legend', {}, 'What went wrong? (optional)'),
        ...reasons.map((r, i) =>
          h(
            'label',
            { class: 'cmsg__reason' },
            h('input', { type: 'radio', name: `reason-${msgId}`, value: String(i) }),
            ` ${r}`,
          ),
        ),
      ),
      h(
        'label',
        { for: `why-${msgId}`, class: 'cmsg__why-label' },
        'Anything else you’d like to tell us? (optional)',
      ),
      h('textarea', { id: `why-${msgId}`, rows: '2', maxlength: '500' }),
      h(
        'button',
        { type: 'button', class: 'cbutton', 'data-coach-feedback-send': '' },
        'Send feedback',
      ),
    );
  }

  /* ---------- Voice input (only where the browser supports it) ---------- */
  type Recognition = {
    lang: string;
    interimResults: boolean;
    start(): void;
    stop(): void;
    onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onend: (() => void) | null;
  };
  const w = window as unknown as Record<string, (new () => Recognition) | undefined>;
  const Speech = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  const mic = root.querySelector<HTMLButtonElement>('[data-coach-mic]');
  const micNote = root.querySelector<HTMLElement>('[data-coach-mic-note]');
  if (Speech && mic && micNote) {
    mic.hidden = false;
    let rec: Recognition | null = null;
    mic.addEventListener('click', () => {
      micNote.hidden = false; // "Your browser may send your voice to its maker…"
      if (rec) {
        rec.stop();
        return;
      }
      rec = new Speech();
      rec.lang = 'en-ZA';
      rec.interimResults = false;
      rec.onresult = (e) => {
        const said = Array.from(e.results)
          .map((r) => r[0]?.transcript ?? '')
          .join(' ');
        input.value = `${input.value} ${said}`.trim();
      };
      rec.onend = () => {
        rec = null;
        mic.setAttribute('aria-pressed', 'false');
        input.focus();
      };
      mic.setAttribute('aria-pressed', 'true');
      rec.start();
    });
  }
}

initCoach().catch((error: unknown) => console.warn('[coach]', error));
