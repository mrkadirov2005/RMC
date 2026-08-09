const path = require('path');
const { spawnSync } = require('child_process');

const cli = path.join(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
const result = spawnSync(process.execPath, [cli, 'test', '--list', '--project=chromium'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: { ...process.env, CI: '1' },
});

if (result.status !== 0) {
  process.stderr.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  process.exit(result.status || 1);
}

const ids = `${result.stdout}\n${result.stderr}`.match(/\bWF-\d{3}\b/g) || [];
const counts = new Map();
for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);

const expected = Array.from({ length: 320 }, (_, index) => `WF-${String(index + 1).padStart(3, '0')}`);
const missing = expected.filter((id) => !counts.has(id));
const duplicates = [...counts].filter(([, count]) => count !== 1);
const unexpected = [...counts.keys()].filter((id) => !expected.includes(id));

if (missing.length || duplicates.length || unexpected.length) {
  if (missing.length) console.error(`Missing: ${missing.join(', ')}`);
  if (duplicates.length) console.error(`Duplicates: ${duplicates.map(([id, count]) => `${id} (${count})`).join(', ')}`);
  if (unexpected.length) console.error(`Unexpected: ${unexpected.join(', ')}`);
  process.exit(1);
}

console.log('Verified 320 unique local Playwright workflows (WF-001 through WF-320).');
