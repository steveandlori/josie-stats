import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formulaStage, stagesByFormula, countStages, stageDiff } from '../js/guide.js';
import { State } from '../js/scheduler.js';

const cards = (id, withScenario = true) => [
  { id: `${id}:recall`, kind: 'recall', formula: { id } },
  { id: `${id}:cloze`, kind: 'cloze', formula: { id } },
  { id: `${id}:use`, kind: 'use', formula: { id } },
  ...(withScenario ? [{ id: `sc:${id}`, kind: 'scenario', formula: { id } }] : []),
];
const fsrs = (state, stability = 1) => ({ state, stability, due: new Date() });
const store = obj => id => obj[id] || null;

test('a formula whose recall card was never seen is new', () => {
  assert.equal(formulaStage(cards('mean'), store({})), 'new');
});
test('recall card in learning steps means learning', () => {
  assert.equal(formulaStage(cards('mean'), store({ 'mean:recall': fsrs(State.Learning) })), 'learning');
});
test('recall card relearning means learning', () => {
  assert.equal(formulaStage(cards('mean'), store({ 'mean:recall': fsrs(State.Relearning, 9) })), 'learning');
});
test('recall in review but cloze unseen is graduated', () => {
  assert.equal(formulaStage(cards('mean'), store({ 'mean:recall': fsrs(State.Review, 9) })), 'graduated');
});
test('recall, cloze and scenario in review with stability >= 7 is solid', () => {
  const s = store({ 'mean:recall': fsrs(State.Review, 7), 'mean:cloze': fsrs(State.Review, 2), 'sc:mean': fsrs(State.Review, 1) });
  assert.equal(formulaStage(cards('mean'), s), 'solid');
});
test('stability below 7 keeps a formula graduated', () => {
  const s = store({ 'mean:recall': fsrs(State.Review, 6.9), 'mean:cloze': fsrs(State.Review, 2), 'sc:mean': fsrs(State.Review, 1) });
  assert.equal(formulaStage(cards('mean'), s), 'graduated');
});
test('a formula without a scenario card can be solid', () => {
  const s = store({ 'range:recall': fsrs(State.Review, 10), 'range:cloze': fsrs(State.Review, 2) });
  assert.equal(formulaStage(cards('range', false), s), 'solid');
});
test('scenario card still unseen blocks solid', () => {
  const s = store({ 'mean:recall': fsrs(State.Review, 10), 'mean:cloze': fsrs(State.Review, 2) });
  assert.equal(formulaStage(cards('mean'), s), 'graduated');
});
test('stagesByFormula and countStages aggregate the deck', () => {
  const deck = [...cards('mean'), ...cards('range', false)];
  const map = stagesByFormula(deck, store({ 'mean:recall': fsrs(State.Learning) }));
  assert.equal(map.get('mean'), 'learning');
  assert.equal(map.get('range'), 'new');
  assert.deepEqual(countStages(map), { new: 1, learning: 1, graduated: 0, solid: 0 });
});
test('stageDiff lists formulas that advanced', () => {
  const before = new Map([['a', 'new'], ['b', 'learning'], ['c', 'graduated'], ['d', 'solid']]);
  const after = new Map([['a', 'learning'], ['b', 'graduated'], ['c', 'solid'], ['d', 'solid']]);
  assert.deepEqual(stageDiff(before, after), { met: ['a'], graduated: ['b'], solid: ['c'] });
});
