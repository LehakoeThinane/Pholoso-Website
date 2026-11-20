/**
 * Kids' World graphics kit (brief v5 §10), drawn in code at build time, so it costs almost no
 * data: torn-paper edges and triangle bunting. A fixed seed means the same drawing every build.
 */

/** A small repeatable random generator (mulberry32). */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A torn-paper edge: an irregular jagged top, filled down to the bottom of the box.
 * Coordinates are in a 1440-wide box of the given height (the SVG stretches to fit).
 */
export function tornPath(seed: number, height = 60, top = 14, jitter = 12): string {
  const r = random(seed);
  const pts: string[] = [`M0 ${height}`, `L0 ${(top + r() * jitter).toFixed(1)}`];
  for (let x = 0; x < 1440;) {
    x = Math.min(1440, x + 18 + r() * 22);
    pts.push(`L${x.toFixed(1)} ${(top + r() * jitter).toFixed(1)}`);
  }
  pts.push(`L1440 ${height}`, 'Z');
  return pts.join(' ');
}

/** Triangle bunting: the logo's triangle as flags on a gently sagging string. */
export function bunting(
  flags = 14,
  width = 1200,
): { string: string; flags: { d: string; i: number }[] } {
  const step = width / flags;
  const sag = (x: number) => 10 + 14 * Math.sin((Math.PI * x) / width); // the string's height at x
  const out = [];
  for (let i = 0; i < flags; i++) {
    const x0 = i * step + step * 0.12;
    const x1 = (i + 1) * step - step * 0.12;
    const xm = (x0 + x1) / 2;
    out.push({
      d: `M${x0.toFixed(1)} ${sag(x0).toFixed(1)} L${x1.toFixed(1)} ${sag(x1).toFixed(1)} L${xm.toFixed(1)} ${(sag(xm) + step * 0.62).toFixed(1)} Z`,
      i,
    });
  }
  return { string: `M0 10 Q${width / 2} 38 ${width} 10`, flags: out };
}
