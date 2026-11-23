/**
 * Draws the Parent Coach's message blocks (types.ts) as HTML. Styles: src/styles/coach.css.
 * Text is always inserted as text, never as HTML: only **bold** and *italic* are recognised.
 */
import type { Block } from './types';

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

/** Plain text with **bold** and *italic*, safely. */
function rich(text: string): (Node | string)[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
    .filter(Boolean)
    .map((p) =>
      p.startsWith('**')
        ? h('strong', {}, p.slice(2, -2))
        : p.startsWith('*')
          ? h('em', {}, p.slice(1, -1))
          : p,
    );
}

const icon = (glyph: string) => h('span', { class: 'cblock__icon', 'aria-hidden': 'true' }, glyph);
const label = (text: string) => h('p', { class: 'cblock__label' }, text);

let ratingCount = 0;

export function renderBlock(block: Block, art: (id: string) => Node | null): HTMLElement {
  switch (block.type) {
    case 'validation':
      return h(
        'div',
        { class: 'cblock cblock--validation' },
        icon(block.icon === 'heart' ? '♥' : '☁'),
        h('p', {}, ...rich(block.text)),
      );
    case 'text':
      return h('p', { class: 'cblock cblock--text' }, ...rich(block.text));
    case 'strategy': {
      const card = h(
        'div',
        { class: 'cblock cblock--strategy' },
        label('A strategy to try'),
        h('p', { class: 'cblock__title' }, block.title),
        h('p', {}, ...rich(block.text)),
      );
      const picture = art(block.id);
      if (picture) card.prepend(h('div', { class: 'cblock__art' }, picture));
      return card;
    }
    case 'say_this':
      return h(
        'div',
        { class: 'cblock cblock--say' },
        label('Say this'),
        h('p', { class: 'cblock__quote' }, `“${block.text}”`),
      );
    case 'how_to_introduce':
      return h(
        'div',
        { class: 'cblock cblock--say' },
        label('How to introduce it'),
        h('p', {}, ...rich(block.text)),
      );
    case 'plan':
      return h(
        'div',
        { class: 'cblock cblock--plan' },
        h('p', { class: 'cblock__title' }, block.title),
        h(
          'ol',
          { class: 'cblock__steps' },
          ...block.steps.map((s) =>
            h('li', {}, h('strong', {}, s.label), h('span', {}, ...rich(s.text))),
          ),
        ),
      );
    case 'tip':
      return h(
        'div',
        { class: 'cblock cblock--tip' },
        icon('★'),
        h(
          'div',
          {},
          h('p', { class: 'cblock__title' }, block.title),
          h('p', {}, ...rich(block.text)),
        ),
      );
    case 'account_prompt':
      return h(
        'div',
        { class: 'cblock cblock--card' },
        h('p', { class: 'cblock__title' }, 'Save your progress'),
        h(
          'p',
          { 'data-coach-save-text': '' },
          'Save this plan and come back to adjust it with me. We will email you a link to sign in: no password.',
        ),
        h(
          'form',
          { class: 'cblock__save', 'data-coach-save': '', novalidate: '' },
          h('label', { class: 'onboard__label', for: 'save-email' }, 'Your email address'),
          h('input', {
            class: 'onboard__input',
            id: 'save-email',
            name: 'email',
            type: 'email',
            autocomplete: 'email',
            inputmode: 'email',
            required: '',
            maxlength: '254',
          }),
          h('button', { type: 'submit', class: 'cbutton' }, 'Save: email me a link'),
        ),
        h(
          'button',
          { type: 'button', class: 'cbutton cbutton--plain', 'data-coach-skip': '' },
          'Skip: I’ll start over when I come back',
        ),
      );
    case 'closing': {
      const n = ++ratingCount;
      const stars = h(
        'fieldset',
        { class: 'cblock__rating' },
        h('legend', {}, 'How did this session go?'),
        ...[1, 2, 3, 4, 5].map((i) =>
          h(
            'label',
            { class: 'cblock__star' },
            h('input', {
              type: 'radio',
              name: `coach-rating-${n}`,
              value: String(i),
              'data-coach-rate': '',
            }),
            h('span', { 'aria-hidden': 'true' }, '★'),
            h('span', { class: 'visually-hidden' }, i === 1 ? '1 star' : `${i} stars`),
          ),
        ),
      );
      return h(
        'div',
        { class: 'cblock cblock--card cblock--closing' },
        h('p', { class: 'cblock__title' }, block.title),
        h('p', {}, ...rich(block.text)),
        stars,
        h(
          'button',
          { type: 'button', class: 'cbutton', 'data-coach-restart': '' },
          'Start a new conversation',
        ),
      );
    }
  }
}
