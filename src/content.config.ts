/**
 * Content collections: content that will grow. Each entry is one Markdown file.
 * Adding an entry: copy an existing file in the same folder and edit it. The build checks
 * every file against the schema below and stops with a clear message if a field is wrong.
 * See docs/CONTENT-GUIDE.md.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Story categories, in the order the filter buttons appear. */
export const storyCategories = {
  parents: { label: 'Parent', filter: 'Parents' },
  'young-people': { label: 'Young person', filter: 'Young people' },
  educators: { label: 'Educator', filter: 'Educators' },
  professionals: { label: 'Professional', filter: 'Professionals' },
} as const;

/** The four areas every interest maps to, in display order. */
export const learningAreas = [
  'Numbers',
  'Reading and language',
  'Science and the world',
  'Social and emotional',
] as const;

const stories = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/stories' }),
  schema: z.object({
    order: z.number().int(),
    category: z.enum(Object.keys(storyCategories) as [keyof typeof storyCategories]),
    /** The quote, written as the person said it, without quotation marks. */
    quote: z.string().min(10),
    /** Pseudonym and role, e.g. "Thandi, mother of Sipho, 7". */
    who: z.string(),
    misunderstand: z.string(),
    friction: z.string(),
    helps: z.string(),
    change: z.string(),
    /** Shown on the home page as the featured voice (one story only). */
    featured: z.boolean().default(false),
  }),
});

const interests = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/interests' }),
  schema: z.object({
    order: z.number().int(),
    name: z.string(),
    cards: z
      .array(z.object({ area: z.enum(learningAreas), text: z.string() }))
      .length(4)
      .refine((cards) => cards.every((c, i) => c.area === learningAreas[i]), {
        message: `Cards must be in this order: ${learningAreas.join(', ')}`,
      }),
  }),
});

const resources = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/resources' }),
  schema: z.object({
    order: z.number().int(),
    title: z.string(),
    audience: z.string(),
    summary: z.string(),
    /** 'planned' shows a "Coming soon" card; 'published' also gets its own page. */
    status: z.enum(['planned', 'published']),
    /** Required once published: the date the content was last checked. */
    lastChecked: z.coerce.date().optional(),
  }),
});

const faqs = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/faqs' }),
  schema: z.object({
    order: z.number().int(),
    question: z.string(),
    /** Which page shows this question. */
    page: z.enum(['about', 'donate']),
  }),
});

export const collections = { stories, interests, resources, faqs };
