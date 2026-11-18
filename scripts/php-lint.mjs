// Runs `php -l` on every PHP file in public/ and tests/. PHP_BIN picks the executable.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const php = process.env.PHP_BIN || 'php';
const roots = ['public', 'tests'].filter((d) => existsSync(d));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === 'node_modules') return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = roots.flatMap(walk).filter((f) => f.endsWith('.php'));
let failed = 0;
for (const f of files) {
  try {
    execFileSync(php, ['-l', f], { stdio: 'pipe' });
  } catch (e) {
    failed++;
    console.error(String(e.stdout || e.message));
  }
}
console.log(`php -l: ${files.length} file(s), ${failed} failed`);
process.exit(failed ? 1 : 0);
