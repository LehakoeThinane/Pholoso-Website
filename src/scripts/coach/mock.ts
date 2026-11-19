/**
 * Practice engine for the Parent Coach: a fixed script that walks the coaching arc, so the
 * whole flow can be built, tested and shown to the Foundation without any AI. Loaded only in
 * practice mode (preview builds and tests). It returns exactly the Reply shape the real AI
 * must return in Stage 2, and only uses strategies from the library (strategies.json).
 *
 * Arc (fixed order): ask → validate → offer → interests → logistics → plan → pushback → close.
 * Free text is accepted at every stage and treated as that stage's answer.
 */
import type { Reply, Session, Stage, Strategy } from './types';

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const fill = (text: string, v: Record<string, string>) =>
  text.replace(/\{(child|activity|place)\}/g, (_, k: string) => v[k] ?? '');

const reply = (r: Partial<Reply> & Pick<Reply, 'blocks' | 'next_stage'>): Reply => ({
  choices: [],
  placeholder: 'Type your answer…',
  safety_flag: 'none',
  ...r,
});

/** The first question (after choosing a child, if there is more than one). */
export function opening(session: Session): Reply {
  const kids = session.profile.children;
  if (kids.length > 1 && session.stage === 'pick_child')
    return reply({
      blocks: [{ type: 'text', text: 'Which child would you like to focus on today?' }],
      choices: kids.map((c) => c.name),
      placeholder: 'Type a name…',
      next_stage: 'pick_child',
    });
  const child = kids[session.child]?.name || 'your child';
  return reply({
    blocks: [
      {
        type: 'text',
        text: `Let’s begin. When screen time ends, what usually happens with ${child}?`,
      },
    ],
    choices: [
      `${child} has a meltdown`,
      `${child} bargains for more time`,
      `${child} doesn’t seem to hear me`,
    ],
    placeholder: `Tell me what happens when screen time ends…`,
    next_stage: 'ask',
  });
}

function explain(session: Session, child: string): string {
  const d = session.profile.children[session.child]?.differences ?? [];
  const r = (session.memory.reaction ?? '').toLowerCase();
  const what = r.includes('bargain')
    ? 'Bargaining is often a sign that stopping feels like losing something.'
    : r.includes('hear')
      ? 'When a child is deeply focused, the outside world can fade away. Not hearing you is often real, not rudeness.'
      : 'A big reaction at the end of screen time is common.';
  const why = d.includes('adhd')
    ? `For ${child}, moving attention away from something fast and exciting takes extra effort from a brain that works with ADHD.`
    : d.includes('autism')
      ? `For ${child}, a sudden change can be hard, because many children with autism find unexpected changes stressful.`
      : `Stopping something enjoyable asks a lot of a young brain, and some children find changes much harder than others.`;
  return `${what} ${why} It isn’t naughtiness: ${child}’s brain needs help to change gears.`;
}

export function respond(session: Session, input: string, strategies: Strategy[]): Reply {
  const child = session.profile.children[session.child]?.name || 'your child';
  const s = strategies[0];
  const v = {
    child,
    activity: lower(session.memory.activity ?? 'something they enjoy'),
    place: lower(session.memory.place ?? 'a spot nearby'),
  };
  const stage: Stage = session.stage;

  switch (stage) {
    case 'pick_child': {
      const i = session.profile.children.findIndex(
        (c) => c.name.toLowerCase() === input.trim().toLowerCase(),
      );
      session.child = i >= 0 ? i : 0;
      session.stage = 'ask';
      return opening(session);
    }
    case 'ask':
      session.memory.reaction = input;
      return reply({
        blocks: [
          {
            type: 'validation',
            icon: 'struggle',
            text: 'That sounds really hard. Many parents face this every day, and it is not your fault.',
          },
          { type: 'text', text: explain(session, child) },
          { type: 'text', text: 'Would you like to hear what has helped other families?' },
        ],
        choices: [
          'Yes, show me',
          'We’ve tried everything already',
          `I want to understand ${child} better`,
          'What can I do in the moment?',
        ],
        placeholder: 'Tell me what’s been hardest, or what you hope will change…',
        next_stage: 'validate',
      });
    case 'validate': {
      const i = input.toLowerCase();
      const intro = i.includes('tried')
        ? 'That is exhausting. Let’s try something small and specific, with the exact words to use.'
        : i.includes('understand')
          ? `${child}’s brain is pulled strongly toward things that are fast and rewarding. Ending that suddenly feels like a loss. Having something good to move toward makes the switch easier.`
          : i.includes('moment')
            ? `In the moment: stay calm, use very few words, and give ${child} time. For next time, here is an idea that helps prevent the struggle.`
            : 'Here is one idea that many families find helpful.';
      if (!s) return noStrategy();
      return reply({
        blocks: [
          { type: 'text', text: intro },
          { type: 'strategy', id: s.id, title: s.title, text: fill(s.summary, v) },
          { type: 'text', text: fill(s.why, v) },
          { type: 'text', text: `Does that sound like something you’d like to try with ${child}?` },
        ],
        choices: [
          'Yes, let’s try it',
          'I’m not sure how to start',
          'We already have activities',
          'What counts as an activity?',
        ],
        placeholder: 'Tell me what you think, or ask a question…',
        next_stage: 'offer',
      });
    }
    case 'offer': {
      const answer = input.toLowerCase().includes('what counts')
        ? 'Anything calm and enjoyable that can be ready in a minute: building, drawing, a puzzle, a toy, or helping you with something. '
        : '';
      return reply({
        blocks: [
          {
            type: 'text',
            text: `${answer}Let’s make it fit ${child}. What does ${child} enjoy doing away from screens?`,
          },
        ],
        choices: ['Building with blocks', 'Drawing', 'Playing outside', 'Toys and pretend play'],
        placeholder: `Tell me what ${child} loves to do…`,
        next_stage: 'interests',
      });
    }
    case 'interests':
      session.memory.activity = input;
      return reply({
        blocks: [
          {
            type: 'text',
            text: `Great choice. Where could ${lower(input)} be ready and waiting when screen time ends?`,
          },
        ],
        choices: ['The lounge', `${child}’s bedroom`, 'The kitchen table', 'Outside'],
        placeholder: `Tell me where ${child} could do this…`,
        next_stage: 'logistics',
      });
    case 'logistics': {
      session.memory.place = input;
      if (!s) return noStrategy();
      const w = { ...v, place: lower(input) };
      return reply({
        blocks: [
          { type: 'text', text: `Here is a plan made for ${child}.` },
          { type: 'say_this', text: fill(s.sayThis, w) },
          { type: 'how_to_introduce', text: fill(s.introduce, w) },
          {
            type: 'plan',
            title: `Your plan for ${child}`,
            steps: [
              { label: 'When it’s calm', text: fill(s.plan.calm, w) },
              { label: 'When screen time ends', text: fill(s.plan.ends, w) },
              { label: 'Right after', text: fill(s.plan.after, w) },
            ],
          },
          { type: 'text', text: fill(s.consistency, w) },
          { type: 'text', text: `What do you think ${child} will do the first time you try it?` },
        ],
        choices: ['Get upset', 'Ask for more time', 'Go along with it', 'I’m not sure'],
        placeholder: `Tell me how you think ${child} will react…`,
        next_stage: 'plan',
      });
    }
    case 'plan': {
      const tip = s?.obstacles[0];
      return reply({
        blocks: [
          {
            type: 'validation',
            icon: 'heart',
            text: 'Pushback at the start is normal. It often means the new routine is starting to work.',
          },
          ...(tip
            ? [{ type: 'tip' as const, title: fill(tip.title, v), text: fill(tip.tip, v) }]
            : []),
          { type: 'text', text: 'How does it feel to try this, even if there is some pushback?' },
        ],
        choices: ['I’m ready to try', 'A bit nervous', 'I have a question'],
        placeholder: 'Tell me how you feel about trying it…',
        next_stage: 'pushback',
      });
    }
    case 'pushback':
    case 'close':
      return reply({
        blocks: [
          { type: 'text', text: `You took a real step today: you have a plan made for ${child}.` },
          {
            type: 'text',
            text: 'Try it a few times this week. Then come back, tell me how it went, and we can adjust it together.',
          },
          { type: 'account_prompt' },
        ],
        next_stage: 'close',
      });
    default:
      return closing(child);
  }
}

export function closing(child: string): Reply {
  return reply({
    blocks: [
      {
        type: 'closing',
        title: 'You’ve got this.',
        text: `You know ${child}, and now you have a plan. Come back whenever you need me.`,
      },
    ],
    next_stage: 'done',
  });
}

function noStrategy(): Reply {
  return reply({
    blocks: [
      {
        type: 'text',
        text: 'Sorry, the coach has no strategies ready for this topic yet. The written Parent Guide may help in the meantime.',
      },
    ],
    next_stage: 'done',
  });
}
