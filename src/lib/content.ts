import { getCollection, type CollectionEntry } from 'astro:content';
import { storyCategories } from '../content.config';

type Ordered =
  | 'stories'
  | 'interests'
  | 'resources'
  | 'faqs'
  | 'guides'
  | 'kidsInterests'
  | 'kidsStories'
  | 'kidsFeelings';

/** All entries of a collection, sorted by their `order` field. */
export async function ordered<C extends Ordered>(
  collection: C,
  filter?: (entry: CollectionEntry<C>) => boolean,
): Promise<CollectionEntry<C>[]> {
  const entries = (await getCollection(collection)) as CollectionEntry<C>[];
  return entries
    .filter((e) => (filter ? filter(e) : true))
    .sort((a, b) => (a.data as { order: number }).order - (b.data as { order: number }).order);
}

export function storyCategoryLabel(category: keyof typeof storyCategories): string {
  return storyCategories[category].label;
}

export const storyFilters = Object.entries(storyCategories).map(([value, c]) => ({
  value,
  label: c.filter,
}));
