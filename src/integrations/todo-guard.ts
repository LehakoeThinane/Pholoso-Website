import type { AstroIntegration } from 'astro';
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
