/**
 * /parent-coach/strategies.json: the coach's strategy library for the launch topic.
 * Only approved strategies are included, except in practice mode, where drafts are used so
 * the flow can be tried before review (the practice script is labelled as such).
 */
import { getCollection } from 'astro:content';
import { coach } from '../../config/coach';

export async function GET() {
  const entries = (await getCollection('coachStrategies'))
    .filter((e) => e.id.startsWith(`${coach.topic.id}/`))
    .filter((e) => e.data.status === 'approved' || coach.mode === 'mock')
    .sort((a, b) => a.data.order - b.data.order);
  const strategies = entries.map(({ data: d }) => ({
    id: d.id,
    title: d.title,
    summary: d.summary,
    why: d.why,
    sayThis: d.sayThis,
    introduce: d.introduce,
    plan: d.plan,
    consistency: d.consistency,
    obstacles: d.obstacles,
    status: d.status,
  }));
  return new Response(JSON.stringify({ topic: coach.topic.id, strategies }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
