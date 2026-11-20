/**
 * Parent Guide chat (components/guide/GuidePanel.astro). Loaded only on guide pages.
 *
 * Without this script every answer is a link to the next step's page. With it:
 * - answers become buttons, and replies are added to the same conversation (no page loads),
 *   using /parent-guide/guides.json (the same content the step pages are built from);
 * - a new reply moves focus to its first answer, because the parent used a button;
 * - the message box searches the guide and this website on the device, and keeps focus;
 * - words that suggest danger or an emergency stop the guide and show "Need help now?";
 * - Settings (names and an interest) are saved in this browser only, and personalise messages.
 *
 * Nothing the parent types or taps is sent anywhere.
 */
import { guide } from '../config/guide';
import { announce } from './announce';
import { toggleSpeech } from './listen';

interface Link {
  label: string;
  href: string;
}
interface Step {
  message: string;
  suggestions: string[];
  learnMore: Link[];
  choices: Link[];
}
interface Topic {
  id: string;
  title: string;
  reviewed: boolean;
  keywords: string[];
  steps: Step[];
}
interface Settings {
  parent?: string;
  child?: string;
  interests?: string;
}
type Token = 'name' | 'Name' | 'interest';

const HOME = '/parent-guide/';

/* ---------- Settings: this browser only ---------- */

function readSettings(): Settings {
  try {
    return (JSON.parse(localStorage.getItem(guide.storageKey) ?? '{}') as Settings) ?? {};
  } catch {
    return {};
  }
}
function writeSettings(s: Settings | null): void {
  try {
    if (s) localStorage.setItem(guide.storageKey, JSON.stringify(s));
    else localStorage.removeItem(guide.storageKey);
  } catch {
    /* Storage blocked: the guide still works, it just will not remember. */
  }
}

/** Fills in names and the interest wherever the guide's wording has a {token}. */
function personalise(root: ParentNode = document): void {
  const s = readSettings();
  const child = s.child?.trim();
  const interest = s.interests?.split(',')[0]?.trim();
  const value: Record<Token, string> = {
    name: child || guide.defaults.name,
    Name: child || guide.defaults.Name,
    interest: interest || guide.defaults.interest,
  };
  root.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => {
    el.textContent = value[el.dataset.t as Token] ?? el.textContent;
  });
  const parent = s.parent?.trim();
  root.querySelectorAll('[data-greet]').forEach((el) => {
    el.textContent = parent ? `, ${parent}` : '';
  });
}

/* ---------- Building messages (the same markup as GuideMessage.astro) ---------- */

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

/** Guide wording, with {tokens} as spans that personalise() fills in. */
function words(text: string): (Node | string)[] {
  return text
    .split(/(\{(?:name|Name|interest)\})/)
    .filter(Boolean)
    .map((p) => {
      const m = /^\{(\w+)\}$/.exec(p);
      return m ? h('span', { 'data-t': m[1]! }) : p;
    });
}

const action = (act: string, icon: string, label: string, only: string, pressable = true) =>
  h(
    'button',
    {
      type: 'button',
      class: 'msg__act',
      'data-act': act,
      [only]: '',
      ...(pressable ? { 'aria-pressed': 'false' } : {}),
    },
    h('span', { 'aria-hidden': 'true' }, icon),
    ` ${label}`,
  );

function choices(list: Link[], label = 'Your answer'): HTMLUListElement {
  return h(
    'ul',
    { class: 'choices', 'aria-label': label },
    ...list.map((c) =>
      h(
        'li',
        {},
        h('button', { type: 'button', class: 'choice', 'data-href': c.href }, ...words(c.label)),
      ),
    ),
    h(
      'li',
      {},
      h(
        'button',
        { type: 'button', class: 'choice choice--else', 'data-act': 'else' },
        'Something else',
      ),
    ),
  );
}

function message(opts: {
  from: string;
  draft: boolean;
  text: string;
  suggestions?: string[];
  links?: Link[];
  answers: Link[];
  answersLabel?: string;
}): HTMLElement {
  const from = h('p', { class: 'msg__from' }, h('span', {}, opts.from));
  if (opts.draft) from.append(h('span', { class: 'msg__draft' }, 'Draft – under review'));
  const body = h('div', { class: 'msg__body' }, h('p', {}, ...words(opts.text)));
  if (opts.suggestions?.length)
    body.append(
      h('ul', { class: 'msg__ideas' }, ...opts.suggestions.map((s) => h('li', {}, ...words(s)))),
    );
  for (const l of opts.links ?? [])
    body.append(h('p', { class: 'msg__more' }, 'Learn more: ', h('a', { href: l.href }, l.label)));
  const actions = h(
    'div',
    { class: 'msg__actions' },
    action('helpful', '✓', 'Helpful', 'data-js-only'),
    action('unhelpful', '✗', 'Not helpful', 'data-js-only'),
    action('copy', '⧉', 'Copy', 'data-copy-only', false),
    action('listen', '▶', 'Listen', 'data-speech-only'),
    h(
      'a',
      { class: 'msg__act', href: guide.feedbackHref },
      h('span', { 'aria-hidden': 'true' }, '!'),
      ' Report a problem',
    ),
  );
  return h(
    'div',
    { class: 'msg msg--guide', 'data-msg': '', 'data-added': '' },
    from,
    body,
    actions,
    choices(opts.answers, opts.answersLabel),
  );
}

const topicChoices = (topics: Topic[]) =>
  topics.map((t) => ({ label: t.title, href: `${HOME}${t.id}/1/` }));

/** The reply for an answer's address, or null if it is not a guide step. */
function replyFor(href: string, topics: Topic[]): HTMLElement | null {
  const path = new URL(href, location.href).pathname;
  if (path === HOME)
    return message({
      from: 'From our guide',
      draft: false,
      text: 'What would you like help with?',
      answers: topicChoices(topics),
      answersLabel: 'Topics',
    });
  const m = /^\/parent-guide\/([\w-]+)\/(\d+)\/$/.exec(path);
  const topic = m && topics.find((t) => t.id === m[1]);
  const step = topic?.steps[Number(m![2]) - 1];
  if (!topic || !step) return null;
  return message({
    from: `From our guide: ${topic.title}`,
    draft: !topic.reviewed,
    text: step.message,
    suggestions: step.suggestions,
    links: step.learnMore,
    answers: step.choices,
  });
}

/* ---------- Searching on the device ---------- */

const STOP = new Set(
  'the and for with about what how when why does did doing has have had his her him she they them their this that there what who will would should could can cant not but our you your yours are was were been being from into just very much more most some any all its it’s i’m dont don’t son daughter kid kids child child’s children help need want get gets like really always never'.split(
    ' ',
  ),
);
const terms = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s’'-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (w.length > 4 ? w.replace(/(ies|es|s)$/, '') : w));

function search(query: string, topics: Topic[]) {
  const q = new Set(terms(query));
  const score = (text: string, weight: number) => {
    const t = new Set(terms(text));
    let n = 0;
    q.forEach((w) => t.has(w) && (n += weight));
    return n;
  };
  const found = topics
    .map((t) => ({
      t,
      n:
        score(`${t.title} ${t.keywords.join(' ')}`, 3) +
        score(t.steps.map((s) => [s.message, ...s.suggestions].join(' ')).join(' '), 1),
    }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((r) => r.t);
  const pages = guide.searchPages
    .map((p) => ({ p, n: score(`${p.title} ${p.words}`, 1) }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map((r) => ({ label: r.p.title, href: r.p.href }));
  return { found, pages };
}

const crisis = new RegExp(
  `(^|[^\\p{L}])(${guide.crisisWords.map((w) => w.replace(/[-]/g, '[- ]?')).join('|')})([^\\p{L}]|$)`,
  'iu',
);

/* ---------- The chat ---------- */

export function initGuide(): void {
  const panel = document.querySelector<HTMLElement>('[data-guide]');
  const log = panel?.querySelector<HTMLElement>('[data-guide-log]');
  if (!panel || !log) return;
  const form = panel.querySelector<HTMLFormElement>('[data-guide-composer]');
  const input = form?.querySelector('input');
  const help = panel.querySelector<HTMLTemplateElement>('template[data-guide-help]');

  let data: Promise<Topic[]> | undefined;
  const load = () =>
    (data ??= fetch('/parent-guide/guides.json')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ topics: Topic[] }>;
      })
      .then((d) => d.topics)
      .catch((e: unknown) => {
        data = undefined;
        throw e;
      }));

  personalise();

  // Answers on the page become buttons (they continue the conversation here)
  log.querySelectorAll<HTMLAnchorElement>('a[data-go]').forEach((a) => {
    const b = h('button', {
      type: 'button',
      class: a.className,
      'data-href': a.getAttribute('href')!,
    });
    b.append(...a.childNodes);
    a.replaceWith(b);
  });

  const add = (node: HTMLElement) => {
    log.append(node);
    personalise(node);
    return node;
  };
  const you = (text: string) =>
    add(
      h(
        'div',
        { class: 'msg msg--you', 'data-added': '' },
        h('p', { class: 'visually-hidden' }, 'You said:'),
        h('p', {}, text),
      ),
    );
  /** Earlier answers are hidden once one is chosen, so only the latest can be used. */
  const retire = () =>
    log.querySelectorAll<HTMLElement>('.choices:not([hidden])').forEach((c) => (c.hidden = true));

  async function choose(button: HTMLButtonElement): Promise<void> {
    const href = button.dataset.href!;
    let topics: Topic[];
    try {
      topics = await load();
    } catch {
      location.href = href; // No data: open the step's own page instead
      return;
    }
    const reply = replyFor(href, topics);
    if (!reply) {
      location.href = href;
      return;
    }
    retire();
    you(button.textContent?.trim() ?? '');
    add(reply);
    reply.querySelector<HTMLElement>('.choice')?.focus();
  }

  async function ask(text: string): Promise<void> {
    retire();
    you(text);
    if (crisis.test(text)) {
      const card = help?.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
      if (card) {
        card.setAttribute('data-added', '');
        card.append(choices([{ label: 'Back to the topics', href: HOME }], 'Next'));
        add(card);
      }
      return;
    }
    let topics: Topic[];
    try {
      topics = await load();
    } catch {
      add(
        message({
          from: 'From our guide',
          draft: false,
          text: 'Sorry, the guide could not load just now. Please check your connection and try again.',
          answers: [{ label: 'Back to the topics', href: HOME }],
        }),
      );
      return;
    }
    const { found, pages } = search(text, topics);
    add(
      message({
        from: 'From our guide',
        draft: found.some((t) => !t.reviewed),
        text: found.length
          ? 'Here is what I found in this guide.'
          : pages.length
            ? 'I could not find that in this guide yet, but these pages may help.'
            : 'I could not find that in this guide yet. Choose a topic, or contact us and a person will reply.',
        links: found.length
          ? pages
          : [
              ...pages,
              { label: 'Contact us about support', href: '/contact/?topic=support' },
            ].slice(0, 2),
        answers: found.length ? topicChoices(found) : topicChoices(topics).slice(0, 3),
        answersLabel: 'Topics',
      }),
    );
  }

  log.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button) return;
    const msg = button.closest<HTMLElement>('[data-msg]');
    const act = button.dataset.act;
    if (button.dataset.href) {
      void choose(button);
    } else if (act === 'else') {
      input?.focus();
    } else if (act === 'helpful' || act === 'unhelpful') {
      const on = button.getAttribute('aria-pressed') !== 'true';
      msg
        ?.querySelectorAll('[data-act="helpful"], [data-act="unhelpful"]')
        .forEach((b) => b.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', String(on));
      if (on) announce('Thank you. This stays on your device: nothing is sent.');
    } else if (act === 'copy') {
      const body = msg?.querySelector<HTMLElement>('.msg__body');
      navigator.clipboard.writeText(body?.innerText.trim() ?? '').then(
        () => announce('Message copied'),
        () => announce('Could not copy. Please select the text and copy it yourself.'),
      );
    } else if (act === 'listen') {
      const body = msg?.querySelector<HTMLElement>('.msg__body');
      if (body) toggleSpeech(button, body);
    }
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input?.value.trim() ?? '';
    if (!text) return;
    if (input) input.value = '';
    void ask(text);
  });

  /* Info and Settings drawers: one open at a time; Escape or a click elsewhere closes them */
  const drawers = [...panel.querySelectorAll<HTMLDetailsElement>('[data-guide-drawer]')];
  drawers.forEach((d) =>
    d.addEventListener('toggle', () => {
      if (d.open) drawers.forEach((o) => o !== d && (o.open = false));
    }),
  );
  document.addEventListener('click', (event) => {
    drawers.forEach((d) => d.open && !d.contains(event.target as Node) && (d.open = false));
  });
  panel.addEventListener('keydown', (event) => {
    const open = drawers.find((d) => d.open);
    if (event.key === 'Escape' && open) {
      open.open = false;
      open.querySelector('summary')?.focus();
    }
  });

  /* Settings */
  const settings = panel.querySelector<HTMLFormElement>('[data-guide-settings]');
  if (settings) {
    const fill = () => {
      const s = readSettings();
      for (const key of ['parent', 'child', 'interests'] as const) {
        const field = settings.elements.namedItem(key) as HTMLInputElement | null;
        if (field) field.value = s[key] ?? '';
      }
    };
    fill();
    const close = () => {
      const d = settings.closest('details');
      if (d) d.open = false;
      d?.querySelector('summary')?.focus();
    };
    settings.addEventListener('submit', (event) => {
      event.preventDefault();
      const get = (k: string) =>
        ((settings.elements.namedItem(k) as HTMLInputElement | null)?.value ?? '').trim();
      writeSettings({ parent: get('parent'), child: get('child'), interests: get('interests') });
      personalise();
      close();
      announce('Settings saved on this device.');
    });
    settings.querySelector('[data-guide-clear]')?.addEventListener('click', () => {
      writeSettings(null);
      fill();
      log.querySelectorAll('[data-added]').forEach((n) => n.remove());
      log.querySelectorAll<HTMLElement>('.choices[hidden]').forEach((c) => (c.hidden = false));
      personalise();
      close();
      announce('Everything cleared: your settings and this conversation.');
    });
  }
}

try {
  initGuide();
} catch (error) {
  console.warn('[guide]', error);
}
