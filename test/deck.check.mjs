// Deck integrity check: every LaTeX string renders under KaTeX strict mode, every cloze
// becomes valid LaTeX when the blank is filled, and every scenario points at real formulas.
// Run: node test/deck.check.mjs   (exits non-zero on any problem)
import { createRequire } from 'node:module';
import { FORMULAS, SCENARIOS } from '../js/cards.js';

const require = createRequire(import.meta.url);
const katex = require('../vendor/katex/katex.min.js');

let bad = 0, n = 0;
const check = (id, src) => {
  n++;
  try { katex.renderToString(src, { displayMode: true, throwOnError: true, strict: 'error', trust: false }); }
  catch (e) { bad++; console.log('KATEX FAIL', id, JSON.stringify(src.slice(0, 70)), '->', e.message.slice(0, 90)); }
};
for (const f of FORMULAS) {
  f.latex.forEach(l => check(f.id, l));
  check(f.id + ':cloze', f.cloze.replace(/\\blank\{([^}]*)\}/g, '\\boxed{$1}'));
  (f.symbols || []).forEach(([s]) => check(f.id + ':symbol', s));
  for (const k of ['name', 'meaning', 'when', 'source']) if (!f[k]) { bad++; console.log('MISSING', f.id, k); }
}
const ids = new Set(FORMULAS.map(f => f.id));
if (ids.size !== FORMULAS.length) { bad++; console.log('DUPLICATE FORMULA ID'); }
for (const sc of SCENARIOS) {
  if (!ids.has(sc.answer)) { bad++; console.log('BAD ANSWER', sc.id, sc.answer); }
  for (const d of sc.distractors) if (!ids.has(d) || d === sc.answer) { bad++; console.log('BAD DISTRACTOR', sc.id, d); }
  if (new Set(sc.distractors).size !== 3) { bad++; console.log('DISTRACTOR COUNT', sc.id); }
}
console.log(`checked ${n} LaTeX strings, ${FORMULAS.length} formulas, ${SCENARIOS.length} scenarios; problems: ${bad}`);
process.exit(bad ? 1 : 0);
