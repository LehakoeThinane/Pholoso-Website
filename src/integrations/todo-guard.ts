import { readdirSync, readFileSync } from 'node:fs';
import type { AstroIntegration } from 'astro';
import { guide } from '../config/guide';
import { site } from '../config/site';
import { findTodos } from '../lib/todo';

/**
 * Fails `astro build` while any value in src/config/site.ts still starts with "TODO:".
 * Set ALLOW_TODO=1 for preview builds (`pnpm build:preview`); those show a
 * "To be confirmed" badge wherever a placeholder is rendered.
 */
export default function todoGuard(): AstroIntegration {
  return {
    name: 'pholoso:todo-guard',
    hooks: {
      'astro:config:setup': ({ command, logger }) => {
        if (command !== 'build') return;
        // Parent Guide: warn (never block) about what still needs the Foundation's sign-off
        const dir = 'src/content/guides';
        const drafts = readdirSync(dir).filter(
          (f) =>
            f.endsWith('.yaml') && /^reviewed:\s*false/m.test(readFileSync(`${dir}/${f}`, 'utf8')),
        );
        if (drafts.length)
          logger.warn(
            `Parent Guide: ${drafts.length} topic(s) not yet reviewed by a qualified professional (shown as "Draft – under review"): ${drafts.join(', ')}`,
          );
        if (guide.helplines.length === 0)
          logger.warn(
            'Parent Guide: no verified helpline numbers yet (src/config/guide.ts). "Need help now?" shows general emergency wording only.',
          );
        const todos = findTodos(site);
        if (todos.length === 0) return;
        const list = todos.map((t) => `  - ${t.path}: ${t.value}`).join('\n');
        if (process.env.ALLOW_TODO === '1') {
          logger.warn(`Preview build with ${todos.length} placeholder(s):\n${list}`);
          return;
        }
        throw new Error(
          `Production build blocked: ${todos.length} placeholder(s) in src/config/site.ts still start with "TODO:".\n` +
            `${list}\nFill them in, or run "pnpm build:preview" (ALLOW_TODO=1) for a preview build.`,
        );
      },
    },
  };
}
