/** Placeholder values start with this prefix. See docs/CONTENT-GUIDE.md. */
export const TODO_PREFIX = 'TODO:';

export function isTodo(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(TODO_PREFIX);
}

export interface TodoEntry {
  path: string;
  value: string;
}

/** Walks any plain object or array and lists every string that is still a placeholder. */
export function findTodos(value: unknown, path = ''): TodoEntry[] {
  if (isTodo(value)) return [{ path, value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => findTodos(v, `${path}[${i}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => findTodos(v, path ? `${path}.${k}` : k));
  }
  return [];
}
