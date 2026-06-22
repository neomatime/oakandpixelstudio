import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = process.cwd();
const dirs = ['.', 'js', 'api'];

async function jsFiles() {
  const out = [];
  for (const dir of dirs) {
    let entries;
    try { entries = await readdir(path.join(root, dir), { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.js')) out.push(path.join(dir, e.name));
    }
  }
  return out;
}

let failed = 0;
for (const f of await jsFiles()) {
  try { await run(process.execPath, ['--check', f]); console.log('ok   ' + f); }
  catch (err) { failed++; console.error('FAIL ' + f + '\n' + (err.stderr || err.message)); }
}
if (failed) { console.error(`\n${failed} file(s) failed node --check.`); process.exit(1); }
console.log('\nAll JS files passed node --check.');
