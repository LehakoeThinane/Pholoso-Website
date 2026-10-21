// Builds dist/ (the exact upload set) from deploy-files.txt.
// Refuses private or development files, so they cannot be uploaded by mistake.
// Usage: node tools/build-dist.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist');

// Never deployable, whatever deploy-files.txt says.
const FORBIDDEN = [
  /(^|\/)\.git(\/|$)/, /(^|\/)\.env/, /(^|\/)\.github(\/|$)/,
  /^(docs|brand|tools|tests|node_modules|dist|var)\//,
  /(^|\/)config(\.example)?\.php$/, /\.(md|markdown|mjs|py|sh|log|bak|sql|zip)$/i,
  /(^|\/)package(-lock)?\.json$/, /(^|\/)playwright\.config\.js$/, /(^|\/)deploy-files\.txt$/,
  /\.(pdf|docx?)$/i,
];

const list = fs.readFileSync(path.join(root, 'deploy-files.txt'), 'utf8')
  .split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));

const problems = [];
for (const f of list) {
  const source = path.join(root, f);
  const invalidPath = !/^[a-zA-Z0-9_./-]+$/.test(f) || path.isAbsolute(f) || f.split('/').some(p => !p || p === '.' || p === '..');
  const escaped = fs.existsSync(source) && (!fs.realpathSync(source).startsWith(fs.realpathSync(root) + path.sep) || !fs.lstatSync(source).isFile());
  if (invalidPath || escaped) problems.push(`unsafe upload path: ${f}`);
  if (FORBIDDEN.some(re => re.test(f))) problems.push(`forbidden in the upload set: ${f}`);
  if (!fs.existsSync(path.join(root, f))) problems.push(`listed but missing: ${f}`);
}
if (new Set(list).size !== list.length) problems.push('duplicate entries in deploy-files.txt');
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
let bytes = 0;
for (const f of list) {
  const dest = path.join(out, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, f), dest);
  bytes += fs.statSync(dest).size;
}
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
fs.writeFileSync(path.join(out, 'version.txt'), `${commit}\n`);
console.log(`dist/ ready: ${list.length + 1} files, ${(bytes / 1024).toFixed(0)} KB`);
