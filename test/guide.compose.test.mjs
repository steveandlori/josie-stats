import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeSession } from '../js/guide.js';
import { State } from '../js/scheduler.js';

const f = (id, kinds = ['recall', 'cloze', 'use']) => kinds.map(k => ({ id: `${id}:${k}`, kind: k, formula: { id } }));
const sc = id => ({ id: `sc:${id}`, kind: 'scenario', formula: { id } });
const rev = (st = 9) => ({ state: State.Review, stability: st, due: new Date(0) });
const rng = () => 0.5; // deterministic shuffle
const phases = (r, p) => r.queue.filter(c => r.phaseOf.get(c.id) === p).map(c => c.id);

test('budget of 1 takes only the recall card of a new formula', () => {
  const deck = [...f('a'), ...f('b')];
  const r = composeSession({ deck, getCard: () => null, isDue: () => false, budget: 1, rng });
  assert.deepEqual(phases(r, 'meet'), ['a:recall']);
  assert.equal(r.queue.length, 1);
});
test('new formulas are met as recall + cloze pairs in deck order', () => {
  const deck = [...f('a'), ...f('b'), ...f('c')];
  const r = composeSession({ deck, getCard: () => null, isDue: () => false, budget: 4, rng });
  assert.deepEqual(new Set(phases(r, 'meet')), new Set(['a:recall', 'a:cloze', 'b:recall', 'b:cloze']));
  assert.deepEqual(phases(r, 'deepen'), []);
});
test('due non-scenario cards are recall; due scenario cards are tell', () => {
  const deck = [...f('a'), sc('a')];
  const cards = { 'a:recall': rev(), 'a:cloze': rev(), 'a:use': rev(), 'sc:a': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: id => id === 'a:recall' || id === 'sc:a', budget: 0, rng });
  assert.deepEqual(phases(r, 'recall'), ['a:recall']);
  assert.deepEqual(phases(r, 'tell'), ['sc:a']);
});
test('graduated formulas get deepen and tell-apart cards before new meets, up to half the budget', () => {
  const deck = [...f('a'), sc('a'), ...f('b')];
  const cards = { 'a:recall': rev(), 'a:cloze': rev() }; // a graduated; a:use and sc:a unseen; b new
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: () => false, budget: 4, rng });
  assert.deepEqual(phases(r, 'tell'), ['sc:a']);
  assert.deepEqual(phases(r, 'deepen'), ['a:use']);
  assert.deepEqual(new Set(phases(r, 'meet')), new Set(['b:recall', 'b:cloze']));
});
test('use cards of a formula still learning are not introduced', () => {
  const deck = [...f('a')];
  const cards = { 'a:recall': { state: State.Learning, stability: 1, due: new Date(0) }, 'a:cloze': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: () => false, budget: 5, rng });
  assert.deepEqual(phases(r, 'deepen'), []);
});
test('leftover budget after meets goes back to deepen cards', () => {
  const deck = [...f('a', ['recall', 'cloze', 'use', 'symbols', 'why'])];
  const cards = { 'a:recall': rev(), 'a:cloze': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: () => false, budget: 3, rng });
  assert.deepEqual(new Set(phases(r, 'deepen')), new Set(['a:use', 'a:symbols', 'a:why']));
});
test('budget never exceeded when meets and deepens compete', () => {
  const deck = [...f('a', ['recall', 'cloze', 'use', 'symbols', 'why']), sc('a'), ...f('b'), ...f('c')];
  const cards = { 'a:recall': rev(), 'a:cloze': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: () => false, budget: 5, rng });
  assert.equal(r.queue.length, 5);
});
test('recall block comes first, then meet, then deepen/tell', () => {
  const deck = [...f('a'), sc('a'), ...f('b')];
  const cards = { 'a:recall': rev(), 'a:cloze': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: id => id === 'a:cloze', budget: 4, rng });
  const order = r.queue.map(c => r.phaseOf.get(c.id));
  const first = p => order.indexOf(p), last = p => order.lastIndexOf(p);
  assert.ok(last('recall') < first('meet'));
  assert.ok(last('meet') < Math.min(first('deepen'), first('tell')));
  assert.deepEqual(r.counts, { recall: 1, meet: 2, deepen: 1, tell: 1 });
});

test('a cloze card left behind by an odd budget is introduced in a later session as meet', () => {
  const deck = [...f('a'), ...f('b')];
  const cards = { 'a:recall': { state: State.Learning, stability: 1, due: new Date(0) } }; // a met, its cloze still new; b new
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: () => false, budget: 1, rng });
  assert.deepEqual(phases(r, 'meet'), ['a:cloze']);
  assert.deepEqual(phases(r, 'recall'), ['a:recall']); // still in learning steps, so it stays in the session
  assert.equal(r.queue.length, 2);
});
test('a cloze card already seen is not re-added by the meet pair', () => {
  const deck = [...f('a')];
  const cards = { 'a:cloze': rev() }; // odd imported state: cloze seen, recall not
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: id => id === 'a:cloze', budget: 4, rng });
  assert.deepEqual(phases(r, 'meet'), ['a:recall']);
  assert.deepEqual(phases(r, 'recall'), ['a:cloze']);
  assert.equal(new Set(r.queue.map(c => c.id)).size, r.queue.length);
});

test('cards in learning steps that are not yet due still belong to the session, after the due ones', () => {
  const deck = [...f('a'), ...f('b')];
  const learning = due => ({ state: State.Learning, stability: 1, due });
  const cards = { 'a:recall': learning(new Date(Date.now() + 5 * 60000)), 'b:recall': { state: State.Review, stability: 9, due: new Date(0) } };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: id => id === 'b:recall', budget: 0, rng });
  assert.deepEqual(phases(r, 'recall'), ['b:recall', 'a:recall']);
  assert.equal(r.counts.recall, 2);
});
