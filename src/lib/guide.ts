/**
 * Parent Guide data, shared by the static step pages, the opening page and guides.json
 * (which the chat script loads, so both read exactly the same content).
 */
import type { CollectionEntry } from 'astro:content';
import { ordered } from './content';

export type GuideTopic = CollectionEntry<'guides'>;

export const guideHome = '/parent-guide/';
export const stepHref = (topic: string, step: number) => `/parent-guide/${topic}/${step}/`;

/** All topics in order, with every answer checked: it must lead to a real step or topic. */
export async function guideTopics(): Promise<GuideTopic[]> {
  const topics = await ordered('guides');
  const ids = new Set(topics.map((t) => t.id));
  for (const t of topics)
    for (const s of t.data.steps)
      for (const c of s.choices)
        if (typeof c.next === 'string' && c.next !== 'home' && !ids.has(c.next))
          throw new Error(
            `Parent Guide: ${t.id} step ${s.step}, answer "${c.label}" points to "${c.next}", which is not a topic`,
          );
  return topics;
}

/** Where an answer leads, as a page address (the no-JavaScript version follows these links). */
export function choiceHref(topic: string, next: number | string): string {
  if (next === 'home') return guideHome;
  if (typeof next === 'number') return stepHref(topic, next);
  return stepHref(next, 1);
}

/** Text with {name}, {Name} and {interest} split out, so they can be personalised. */
export type Part = string | { token: 'name' | 'Name' | 'interest' };

export function parts(text: string): Part[] {
  return text
    .split(/(\{(?:name|Name|interest)\})/)
    .filter(Boolean)
    .map((p) => {
      const m = /^\{(name|Name|interest)\}$/.exec(p);
      return m ? { token: m[1] as 'name' | 'Name' | 'interest' } : p;
    });
}
