// Run every play-test in order and print a summary. Serve the repo root on 8765 and build first (npm run build).
// Usage: node tests/run-all.js            (or: npm test)
const { spawnSync } = require('child_process');
const path = require('path');
const TESTS = ['left-right', 'cold-open', 'prologue', 'chase-cut', 'lesson', 'chase-feel', 'settings', 'xplus', 'coach', 'map', 'three-inline', 'deflect', 'void', 'levels', 'app-inset', 'upright', 'standalone-file'];
const results = [];
for (const t of TESTS) {
  const t0 = Date.now();
  const r = spawnSync('node', [path.join(__dirname, t + '.test.js')], { cwd: __dirname, encoding: 'utf8' });
  const ok = r.status === 0 && !/FAIL/.test(r.stdout + r.stderr);
  results.push([t, ok, ((Date.now() - t0)/1000).toFixed(0) + ' s']);
  console.log(`${ok ? 'pass' : 'FAIL'}  ${t.padEnd(16)} ${results.at(-1)[2]}`);
  if (!ok) console.log((r.stdout + r.stderr).split('\n').slice(-8).join('\n'));
}
const bad = results.filter(r => !r[1]).length;
console.log(bad ? `\n${bad} of ${results.length} failed` : `\nall ${results.length} passed`);
process.exit(bad ? 1 : 0);
