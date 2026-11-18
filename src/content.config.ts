/**
 * Content collections: content that will grow. Each entry is one Markdown file.
 * Adding an entry: copy an existing file in the same folder and edit it. The build checks
 * every file against the schema below and stops with a clear message if a field is wrong.
 * See docs/CONTENT-GUIDE.md.
 */
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
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

/* ---------- Kids' World (src/content/kids/*.yaml: one file per collection) ---------- */

/** The four "you could…" ideas every Kids' World interest has, in display order. */
export const kidsIdeaAreas = {
  numbers: { label: 'Numbers', icon: 'numbers' },
  words: { label: 'Words', icon: 'words' },
  science: { label: 'Find out', icon: 'science' },
  friends: { label: 'Friends', icon: 'friends' },
} as const;

/** A short, read-aloud-friendly sentence for children. */
const kidsLine = z.string().min(3).max(110);

const kidsInterests = defineCollection({
  loader: file('src/content/kids/interests.yaml'),
  schema: z.object({
    order: z.number().int(),
    name: z.string().max(20),
    icon: z.string(),
    ideas: z.object({
      numbers: kidsLine,
      words: kidsLine,
      science: kidsLine,
      friends: kidsLine,
    }),
  }),
});

const kidsStories = defineCollection({
  loader: file('src/content/kids/stories.yaml'),
  schema: z.object({
    order: z.number().int(),
    title: z.string().max(40),
    child: z.string(),
    panels: z
      .array(z.object({ text: kidsLine, icon: z.string().optional() }))
      .min(4)
      .max(6),
  }),
});

const kidsFacts = defineCollection({
  loader: file('src/content/kids/facts.yaml'),
  schema: z.object({
    text: kidsLine,
    /** Where an editor can check the fact. Required; not shown on the page. */
    source: z.string().min(5),
  }),
});

const kidsFeelings = defineCollection({
  loader: file('src/content/kids/feelings.yaml'),
  schema: z.object({
    order: z.number().int(),
    name: z.string().max(12),
    face: z.string(),
    message: kidsLine,
    idea: kidsLine,
    link: z
      .object({
        href: z.string().startsWith('/', 'Feelings links must stay on this website'),
        label: z.string(),
      })
      .optional(),
  }),
});

export const collections = {
  stories,
  interests,
  resources,
  faqs,
  kidsInterests,
  kidsStories,
  kidsFacts,
  kidsFeelings,
};
