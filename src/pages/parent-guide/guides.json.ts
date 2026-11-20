/**
 * /parent-guide/guides.json: every guide topic, built from src/content/guides/ at build time.
 * The chat script (src/scripts/guide.ts) loads it the first time a parent taps an answer, so
 * the chat and the step pages always say exactly the same thing.
 */
import { choiceHref, guideTopics } from '../../lib/guide';

export async function GET() {
  const topics = (await guideTopics()).map((t) => ({
    id: t.id,
    title: t.data.title,
    reviewed: t.data.reviewed,
    keywords: t.data.keywords,
    steps: t.data.steps.map((s) => ({
      message: s.message,
      suggestions: s.suggestions,
      learnMore: s.learnMore,
      choices: s.choices.map((c) => ({ label: c.label, href: choiceHref(t.id, c.next) })),
    })),
  }));
  return new Response(JSON.stringify({ topics }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
