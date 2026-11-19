/**
 * Parent Coach chat screen (src/pages/parent-coach/chat.astro, and /parent-coach/s/<id>/,
 * which the server draws from the same page).
 *
 * Two back ends, one screen:
 * - practice ('mock'): a fixed script in the browser (mock.ts); the session lives in this tab
 *   only (sessionStorage) at /parent-coach/chat/?s=<id>.
 * - live: the server (/api/coach/), which keeps the session for 30 days at
 *   /parent-coach/s/<id>/ and asks the AI provider for each reply.
 *
 * - The first answers are big buttons; later suggestions are chips above the message box.
 * - Keyboard focus stays in the message box after a reply. Replies appear block by block when
 *   motion is allowed, all at once otherwise; the log is marked busy until a reply is complete,
 *   so screen readers announce it once.
 * - Danger words stop the coaching and show "Need help now?".
 */
import { guide } from '../../config/guide';
import { announce } from '../announce';
import { toggleSpeech } from '../listen';
import { h, renderBlock } from './blocks';
import type { Block, Message, Profile, Session, Strategy } from './types';

/** What the screen needs to know about a session. */
interface State {
  parent: string;
  messages: Message[];
  choices: string[];
  placeholder: string;
  ended: boolean;
  rating?: number | null;
}
type Result = { ok: true; added: Message[] } | { ok: false; message: string };

interface Backend {
  state: State;
  answer(text: string): Promise<Result>;
  skip(): Promise<Result>;
  rate(stars: number): Promise<void>;
  feedback(index: number, value: string, reason: string, note: string): Promise<void>;
  restart(): Promise<string>;
}

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
const SORRY =
  'The coach could not reply just now. Your message is still in the box: please try again.';

/* ---------- Practice back end: a fixed script, nothing sent anywhere ---------- */
async function practice(): Promise<Backend | null> {
  const [engine, strategies] = await Promise.all([
    import('./mock'),
    fetch('/parent-coach/strategies.json')
      .then((r) => r.json() as Promise<{ strategies: Strategy[] }>)
      .then((d) => d.strategies),
  ]);
  const id = new URLSearchParams(location.search).get('s');
  let s = id ? store.get<Session>(SESSION + id) : null;
  if (!s) {
    const profile = store.get<Profile>(PROFILE);
    if (!profile) return null;
    s = {
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
    const first = engine.opening(s);
    s.messages.push({ role: 'coach', blocks: first.blocks });
    s.choices = first.choices;
    s.placeholder = first.placeholder;
    history.replaceState(null, '', `?s=${s.id}`);
  }
  const session: Session = s;
  const state: State = {
    parent: session.profile.parent,
    get messages() {
      return session.messages;
    },
    get choices() {
      return session.choices;
    },
    get placeholder() {
      return session.placeholder;
    },
    get ended() {
      return session.ended;
    },
    get rating() {
      return session.rating ?? null;
    },
  };
  const save = () => store.set(SESSION + session.id, session);
  save();
  const push = (added: Message[]): Result => {
    session.messages.push(...added);
    save();
    return { ok: true, added };
  };
  return {
    state,
    async answer(text) {
      const added: Message[] = [{ role: 'parent', text }];
      if (crisis.test(text)) {
        session.ended = true;
        session.choices = [];
        return push([...added, { role: 'coach', help: true }]);
      }
      await wait(animated() ? 700 : 150);
      const r = engine.respond(session, text, strategies);
      session.stage = r.next_stage;
      session.choices = r.choices;
      session.placeholder = r.placeholder;
      return push([...added, { role: 'coach', blocks: r.blocks }]);
    },
    async skip() {
      const r = engine.closing(session.profile.children[session.child]?.name || 'your child');
      session.stage = 'done';
      session.ended = true;
      session.choices = [];
      return push([{ role: 'coach', blocks: r.blocks }]);
    },
    async rate(stars) {
      session.rating = stars;
      save();
    },
    async feedback() {
      /* Practice mode: nothing is sent */
    },
    async restart() {
      store.remove(SESSION + session.id);
      return '/parent-coach/chat/';
    },
  };
}

/* ---------- Live back end: the server ---------- */
async function post(
  url: string,
  data: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  return { status: r.status, json: (await r.json().catch(() => ({}))) as Record<string, unknown> };
}

async function live(root: HTMLElement): Promise<Backend | null> {
  const id =
    root.dataset.session ?? /\/parent-coach\/s\/([0-9a-f-]{36})\//.exec(location.pathname)?.[1];
  if (!id) return null;
  const r = await fetch(`/api/coach/session.php?id=${id}&format=json`, {
    headers: { Accept: 'application/json' },
  });
  if (!r.ok) return null;
  const state = ((await r.json()) as { session: State }).session;
  const turn = async (data: Record<string, string>): Promise<Result> => {
    try {
      const { status, json } = await post('/api/coach/turn.php', { id, ...data });
      if (status !== 200 || !json.ok)
        return { ok: false, message: (json.message as string) || SORRY };
      const added = json.added as Message[];
      state.messages.push(...added);
      state.choices = json.choices as string[];
      state.placeholder = json.placeholder as string;
      state.ended = json.ended as boolean;
      return { ok: true, added };
    } catch {
      return { ok: false, message: SORRY };
    }
  };
  return {
    state,
    answer: (text) => turn({ text }),
    skip: () => turn({ action: 'skip' }),
    async rate(stars) {
      await post('/api/coach/rating.php', { id, rating: stars });
    },
    async feedback(index, value, reason, note) {
      await post('/api/coach/feedback.php', { id, message: index, value, reason, note });
    },
    async restart() {
      const { json } = await post('/api/coach/start.php', { restart_from: id });
      return (json.url as string) || '/parent-coach/start/';
    },
  };
}

/* ---------- The screen ---------- */
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

  let backend: Backend | null;
  try {
    backend = root.dataset.mode === 'live' ? await live(root) : await practice();
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
  if (!backend) {
    location.replace('/parent-coach/start/');
    return;
  }
  const b: Backend = backend;
  const st = b.state;
  if (greet) greet.textContent = st.parent ? `, ${st.parent}` : '';

  /* Drawing */
  let count = 0;
  const actionButton = (act: string, icon: string, label: string, extra: Record<string, string>) =>
    h(
      'button',
      { type: 'button', class: 'cact', 'data-act': act, ...extra },
      h('span', { 'aria-hidden': 'true' }, icon),
      ` ${label}`,
    );
  const actions = () =>
    h(
      'div',
      { class: 'cmsg__actions', role: 'group', 'aria-label': 'Message actions' },
      actionButton('good', '👍', 'Good response', { 'aria-pressed': 'false' }),
      actionButton('bad', '👎', 'Bad response', {
        'aria-pressed': 'false',
        'aria-expanded': 'false',
      }),
      actionButton('copy', '⧉', 'Copy text', { 'data-copy-only': '' }),
      actionButton('listen', '▶', 'Listen', { 'aria-pressed': 'false', 'data-speech-only': '' }),
    );

  async function drawCoach(blocks: Block[], index: number, animate: boolean): Promise<HTMLElement> {
    const id = `coach-msg-${++count}`;
    const body = h('div', { class: 'cmsg__body' });
    const msg = h(
      'div',
      { class: 'cmsg cmsg--coach', id, 'data-msg': '', 'data-index': String(index) },
      h('p', { class: 'visually-hidden' }, 'Coach:'),
      body,
    );
    log.append(msg);
    log.setAttribute('aria-busy', 'true');
    for (const block of blocks) {
      body.append(renderBlock(block, art));
      if (animate) {
        msg.scrollIntoView({ block: 'nearest' });
        await wait(250);
      }
    }
    if (!blocks.some((x) => x.type === 'closing' || x.type === 'account_prompt'))
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
  const drawHelp = () => log.append(template('template[data-coach-help]')!);
  async function draw(m: Message, index: number, animate: boolean): Promise<void> {
    if (m.role === 'parent') drawParent(m.text ?? '');
    else if (m.blocks) await drawCoach(m.blocks, index, animate);
    else drawHelp();
  }

  /** First question: big buttons in the conversation. Later: chips above the message box. */
  function drawChoices(): void {
    log.querySelector('[data-coach-big]')?.remove();
    chips.replaceChildren();
    const big = st.messages.length === 1;
    const list = big
      ? h('ul', { class: 'cbig', 'data-coach-big': '', 'aria-label': 'Suggested answers' })
      : chips;
    for (const c of st.choices)
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
    if (big && st.choices.length) log.append(list);
    chips.hidden = big || !st.choices.length;
    input.placeholder = st.placeholder;
  }
  const end = () => {
    dock.hidden = true;
    chips.replaceChildren();
  };
  function status(text: string): void {
    log.querySelector('[data-coach-status]')?.remove();
    if (text)
      log.append(h('p', { class: 'cmsg__thanks', role: 'status', 'data-coach-status': '' }, text));
  }

  // What is already in the session (a reload, or the page the server drew), without animation
  log.replaceChildren();
  for (const [i, m] of st.messages.entries()) await draw(m, i, false);
  if (st.ended) end();
  else drawChoices();
  const rated = log.querySelector<HTMLInputElement>(`[data-coach-rate][value="${st.rating ?? 0}"]`);
  if (rated) rated.checked = true;

  /* Sending */
  let busy = false;
  async function answer(text: string): Promise<void> {
    text = text.trim();
    if (busy || !text || st.ended) return;
    busy = true;
    status('');
    const before = st.messages.length;
    log.querySelector('[data-coach-big]')?.remove();
    chips.replaceChildren();
    chips.hidden = true;
    drawParent(text);
    send.setAttribute('aria-busy', 'true');
    thinking.hidden = false;
    const r = await b.answer(text);
    thinking.hidden = true;
    send.removeAttribute('aria-busy');
    if (!r.ok) {
      log.lastElementChild?.remove(); // the parent's message: not sent
      input.value = text;
      drawChoices();
      status(r.message);
      busy = false;
      return;
    }
    for (const [i, m] of r.added.entries())
      if (m.role !== 'parent') await draw(m, before + i, animated());
    if (st.ended) end();
    else drawChoices();
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
    const index = Number(msg?.dataset.index ?? -1);
    if (button.dataset.choice) {
      void answer(button.dataset.choice).then(() => input.focus());
      return;
    }
    if (button.hasAttribute('data-coach-skip')) {
      button.disabled = true;
      void b.skip().then(async (r) => {
        if (!r.ok) {
          button.disabled = false;
          status(r.message);
          return;
        }
        end();
        const before = st.messages.length - r.added.length;
        for (const [i, m] of r.added.entries()) await draw(m, before + i, false);
        log.querySelector<HTMLInputElement>('[data-coach-rate]')?.focus();
      });
      return;
    }
    if (button.hasAttribute('data-coach-restart')) {
      void b.restart().then((url) => (location.href = url));
      return;
    }
    const act = button.dataset.act;
    if (act === 'good') {
      const on = button.getAttribute('aria-pressed') !== 'true';
      msg?.querySelector('[data-act="bad"]')?.setAttribute('aria-pressed', 'false');
      msg?.querySelector('[data-coach-feedback]')?.remove();
      button.setAttribute('aria-pressed', String(on));
      void b.feedback(index, on ? 'good' : 'none', '', '');
      if (on) announce('Thank you for the feedback.');
    } else if (act === 'bad') {
      const on = button.getAttribute('aria-pressed') !== 'true';
      msg?.querySelector('[data-act="good"]')?.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-expanded', String(on));
      msg?.querySelector('[data-coach-feedback]')?.remove();
      if (on && msg) {
        const f = feedbackForm(msg.id);
        msg.append(f);
        f.querySelector('input')?.focus();
      } else void b.feedback(index, 'none', '', '');
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
      const f = button.closest<HTMLElement>('[data-coach-feedback]');
      const reasons = JSON.parse(root.dataset.reasons ?? '[]') as string[];
      const picked = f?.querySelector<HTMLInputElement>('input:checked');
      const note = f?.querySelector('textarea')?.value ?? '';
      void b.feedback(index, 'bad', picked ? (reasons[Number(picked.value)] ?? '') : '', note);
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
    void b.rate(Number(radio.value));
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

  /* Voice input (only where the browser supports it) */
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
