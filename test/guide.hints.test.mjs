import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hintLadder, autoRating, nudgeFor, NUDGES, buildSnapshot, pruneSnapshots, revealLine } from '../js/guide.js';
import { State } from '../js/scheduler.js';

const formula = { id: 'mean', name: 'Mean', meaning: 'Balance point.', when: 'Use for averages.', symbols: [['\mu', 'population mean'], ['N', 'size']], cloze: '\bar{x} = \frac{\blank{\sum x}}{n}' };
const card = kind => ({ id: `mean:${kind}`, kind, formula });

test('recall ladder is meaning, symbol names, cloze skeleton', () => {
  assert.deepEqual(hintLadder(card('recall')).map(h => h.type), ['meaning', 'symbols', 'cloze']);
  assert.deepEqual(hintLadder(card('recall'))[1].symbols, ['\mu', 'N']);
  assert.equal(hintLadder(card('recall'))[2].latex, formula.cloze);
});
test('cloze ladder is meaning then symbols with meanings', () => {
  const l = hintLadder(card('cloze'));
  assert.deepEqual(l.map(h => h.type), ['meaning', 'symbolsFull']);
  assert.deepEqual(l[1].symbols, formula.symbols);
});
test('use ladder is name then when', () => {
  assert.deepEqual(hintLadder(card('use')).map(h => h.text), ['Mean', 'Use for averages.']);
});
test('symbols ladder is name then meaning; why ladder is meaning then when', () => {
  assert.deepEqual(hintLadder(card('symbols')).map(h => h.type), ['name', 'meaning']);
  assert.deepEqual(hintLadder(card('why')).map(h => h.type), ['meaning', 'when']);
});
test('a formula without symbols drops the symbols hint', () => {
  const c = { id: 'x:recall', kind: 'recall', formula: { ...formula, symbols: undefined } };
  assert.deepEqual(hintLadder(c).map(h => h.type), ['meaning', 'cloze']);
});
test('scenario cards have no ladder', () => { assert.deepEqual(hintLadder(card('scenario')), []); });
test('automatic rating: none, Hard, Again', () => {
  assert.equal(autoRating(0), null); assert.equal(autoRating(1), 2); assert.equal(autoRating(2), 1); assert.equal(autoRating(3), 1);
});
test('reveal line matches hint depth', () => {
  assert.equal(revealLine(0), null);
  assert.match(revealLine(1), /nudge/);
  assert.match(revealLine(2), /Not yet/);
});
test('nudges rotate through three modalities', () => {
  assert.equal(NUDGES.length, 3);
  assert.equal(nudgeFor(3), NUDGES[0]);
  for (const n of NUDGES) { assert.ok(n.text.length > 5); assert.ok(n.reason.length > 5); }
});
test('snapshot averages scheduled days of review cards only', () => {
  const cards = [{ state: State.Review, scheduled_days: 4 }, { state: State.Review, scheduled_days: 10 }, { state: State.Learning, scheduled_days: 0 }];
  assert.deepEqual(buildSnapshot({ new: 1, learning: 1, graduated: 1, solid: 0 }, cards), { stages: { new: 1, learning: 1, graduated: 1, solid: 0 }, avgInterval: 7 });
  assert.equal(buildSnapshot({ new: 2, learning: 0, graduated: 0, solid: 0 }, []).avgInterval, null);
});
test('pruneSnapshots drops entries older than keepDays', () => {
  const snaps = { '2026-08-01': {}, '2026-10-19': {}, '2026-10-20': {} };
  assert.deepEqual(Object.keys(pruneSnapshots(snaps, '2026-10-20', 60)), ['2026-10-19', '2026-10-20']);
});
