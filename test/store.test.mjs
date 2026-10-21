import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importState, exportState, DEFAULT_SETTINGS } from '../js/store.js';

test('defaults include introSeen=false and showPad=true', () => {
  assert.equal(DEFAULT_SETTINGS.introSeen, false); assert.equal(DEFAULT_SETTINGS.showPad, true);
});
test('a pre-release export imports with snapshots and new settings defaulted', () => {
  const old = JSON.stringify({ app: 'josie-stats', version: 1, settings: { newPerDay: 15 }, cards: {}, log: [], newIntroduced: {}, sessions: {} });
  const s = importState(old);
  assert.deepEqual(s.snapshots, {});
  assert.equal(s.settings.newPerDay, 15); assert.equal(s.settings.introSeen, false); assert.equal(s.settings.showPad, true);
});
test('export round-trips snapshots', () => {
  const s = importState(JSON.stringify({ app: 'josie-stats', snapshots: { '2026-10-20': { stages: { new: 1 }, avgInterval: 3 } } }));
  assert.deepEqual(JSON.parse(exportState(s)).snapshots, s.snapshots);
});

test('grade buttons default to three', () => {
  assert.equal(DEFAULT_SETTINGS.gradeButtons, 3);
});
test('an export with the old fourButtons flag imports as four grade buttons', () => {
  const s = importState(JSON.stringify({ app: 'josie-stats', settings: { fourButtons: true } }));
  assert.equal(s.settings.gradeButtons, 4);
  const t = importState(JSON.stringify({ app: 'josie-stats', settings: { fourButtons: false } }));
  assert.equal(t.settings.gradeButtons, 3);
});
