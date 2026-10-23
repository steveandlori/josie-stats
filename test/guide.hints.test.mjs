import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hintLadder, autoRating, nudgeFor, NUDGES, buildSnapshot, pruneSnapshots, revealLine, meetStep, meetStars, CLEAN_RECALLS, carryMeet } from '../js/guide.js';
import { makeScheduler, emptyCard, grade, Rating } from '../js/scheduler.js';
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

test('a Meet card moves a step on Got it or Easy, holds on Partly, restarts on Not yet', () => {
  assert.equal(CLEAN_RECALLS, 3);
  assert.equal(meetStep(0, 3, false), 1);
  assert.equal(meetStep(1, 2, false), 1);
  assert.equal(meetStep(2, 1, false), 0);
  assert.equal(meetStep(2, 3, false), 2);          // never complete while still in learning steps
  assert.equal(meetStep(0, 4, true), CLEAN_RECALLS);
});
test('Meet stars rise evenly with clean recalls, not with finished cards', () => {
  // 10 cards, 30 clean recalls: one star per 6 recalls.
  const seq = [];
  const steps = new Map();
  for (let round = 0; round < 3; round++) for (let c = 0; c < 10; c++) {
    steps.set(c, round + 1);
    seq.push(meetStars(steps.values(), 10));
  }
  assert.deepEqual([5, 11, 17, 23, 29].map(i => seq[i]), [1, 2, 3, 4, 5]);
  assert.equal(seq[4], 0);
  assert.equal(meetStars([], 0), 0);
});
test('CLEAN_RECALLS matches the scheduler: a new card leaves learning after that many Got its', () => {
  const sch = makeScheduler({ midterm: '', final: '', retention: 0.9 });
  let t = new Date('2026-10-23T12:00:00Z');
  let c = emptyCard(t);
  for (let i = 0; i < CLEAN_RECALLS; i++) {
    assert.notEqual(c.state, State.Review, `left learning early, after ${i}`);
    c = grade(sch, c, Rating.Good, t).card;
    t = new Date(c.due);
  }
  assert.equal(c.state, State.Review);
});
test('Meet progress starts fresh on a new day', () => {
  const phaseOf = new Map([['a', 'meet'], ['b', 'recall'], ['c', 'meet']]);
  const rec = carryMeet({ day: '2026-10-22', ids: ['x'], steps: { x: 2 }, stars: 3 }, '2026-10-23', phaseOf);
  assert.deepEqual(rec, { day: '2026-10-23', ids: ['a', 'c'], steps: {}, stars: 0 });
  assert.deepEqual(carryMeet(null, '2026-10-23', phaseOf).ids, ['a', 'c']);
});
test('a rebuilt session the same day keeps Meet progress and earned stars', () => {
  // Card a was met earlier today and is still in learning, so the composer filed it under Recall.
  const phaseOf = new Map([['a', 'recall'], ['d', 'meet'], ['e', 'recall']]);
  const rec = carryMeet({ day: '2026-10-23', ids: ['a', 'b'], steps: { a: 2, b: 3 }, stars: 2 }, '2026-10-23', phaseOf);
  assert.equal(phaseOf.get('a'), 'meet');
  assert.equal(phaseOf.get('e'), 'recall');
  assert.deepEqual(rec, { day: '2026-10-23', ids: ['a', 'b', 'd'], steps: { a: 2, b: 3 }, stars: 2 });
});
test('a saved Meet card that was never graded and is no longer queued drops out of the count', () => {
  // A smaller rebuild (less new-card allowance left) no longer queues d; it must not hold the stars short of 5.
  const phaseOf = new Map([['a', 'recall']]);
  const rec = carryMeet({ day: '2026-10-23', ids: ['a', 'b', 'd'], steps: { a: 2, b: 3 }, stars: 1 }, '2026-10-23', phaseOf);
  assert.deepEqual(rec.ids, ['a', 'b']);
});
