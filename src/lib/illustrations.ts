/**
 * Looks up an illustration by its path inside src/assets/illustrations/, without ".svg":
 * "icons/train", "mascot/hello", "children/lerato", "feelings/happy".
 *
 * The SVG files are inlined into the page (no extra download, and CSS can recolour or
 * animate named parts). See src/assets/illustrations/README.md for the file rules.
 * A missing name stops the build with a clear message, so a typo never ships.
 */
import type { SvgComponent } from 'astro/types';

const files = import.meta.glob<{ default: SvgComponent }>('../assets/illustrations/**/*.svg', {
  eager: true,
});

export function illustration(name: string): SvgComponent {
  const file = files[`../assets/illustrations/${name}.svg`];
  if (!file) {
    const known = Object.keys(files)
      .map((k) => k.replace('../assets/illustrations/', '').replace('.svg', ''))
      .join(', ');
    throw new Error(`Illustration "${name}" not found. Known illustrations: ${known}`);
  }
  return file.default;
}
