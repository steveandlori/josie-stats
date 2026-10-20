# Guided Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the research-backed learning loop (guess, hint, reveal, grade honestly, discriminate) the app's guided default, explained by a "How it works" screen with verified references.

**Architecture:** Pure session logic (stages, composer, hints, snapshots) goes in a new DOM-free module `js/guide.js` tested with `node --test`. The DOM layer in `js/app.js` gains a Today route that uses the composer, a shared recall-loop renderer with a hint ladder and scratchpad (`js/pad.js`), a wrap-up screen, and Progress additions. `js/method.js` holds the How it works content and references.

**Tech Stack:** Vanilla ES modules, KaTeX (global, vendored), ts-fsrs 5.4.1 (vendored ESM), Node 24 `node --test` for unit tests, Playwright MCP for browser checks. No build step.

**Spec:** `docs/superpowers/specs/2026-10-20-guided-learning-loop-design.md`

## Global Constraints

- Static site, no build step, no dependencies beyond what is vendored. Node is for tests only.
- Backward compatible storage: every new field defaults on `loadState` and `importState`; key stays `josie-stats-v1`.
- Tone covenant: never "wrong" or "failed" on a card; grade buttons read **Not yet** / **Got it**; every post-miss line is encouraging and true to the research.
- Every research claim in How it works maps to a numbered reference with a DOI resolved on 2026-10-20; the adversarial review (Task 11) must pass before push.
- Works at 390px and 1100px, light and dark, no console errors, no horizontal page scroll.
- `Statistics.pdf` stays gitignored.

## Review Focus

1. **Budget of 1 with a new formula pending.** Meet pairs cost 2; the composer must take the recall card alone, never exceed the budget. Test in Task 2.
2. **Formula with no scenario card** (e.g. `range`). Solid must not require a scenario card that does not exist. Test in Task 1.
3. **Hint taken, then keyboard "2" pressed.** Grade must be the automatic one, not a learner override. Test in Task 6 (browser) and guarded by `autoRating` in Task 3.
4. **Storage from before this release** (no `snapshots`, no `introSeen`). Must load with defaults and show How it works once. Test in Task 4.
5. **Scratchpad with zero strokes.** Reveal must not show an empty "Your answer" box. Test in Task 5 (browser).

---

### Task 1: Formula stages (`js/guide.js`)

**Files:**
- Create: `js/guide.js`
- Test: `test/guide.stages.test.mjs`

**Interfaces:**
- Produces: `formulaStage(fcards, getCard) -> 'new'|'learning'|'graduated'|'solid'` where `fcards` are the deck cards of one formula (`{id, kind}`) and `getCard(id)` returns a hydrated FSRS card or `null`. `stagesByFormula(deck, getCard) -> Map<formulaId, stage>`; `countStages(map) -> {new, learning, graduated, solid}`; `stageDiff(before, after) -> {met: [], graduated: [], solid: []}` (formula ids that reached each stage). `STAGES = ['new','learning','graduated','solid']`, `STAGE_LABEL`.

- [ ] **Step 1: Write the failing tests**

```js
// test/guide.stages.test.mjs
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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test test/` — Expected: FAIL, cannot find module `../js/guide.js`.

- [ ] **Step 3: Implement**

```js
// js/guide.js — pure session logic for the guided loop. No DOM.
import { State } from './scheduler.js';

export const STAGES = ['new', 'learning', 'graduated', 'solid'];
export const STAGE_LABEL = { new: 'New', learning: 'Learning', graduated: 'Graduated', solid: 'Solid' };
const SOLID_STABILITY_DAYS = 7;

const inReview = c => !!c && c.state === State.Review;

export function formulaStage(fcards, getCard) {
  const recall = getCard(fcards.find(c => c.kind === 'recall')?.id);
  if (!recall) return 'new';
  if (!inReview(recall)) return 'learning';
  const cloze = fcards.find(c => c.kind === 'cloze');
  const scen = fcards.find(c => c.kind === 'scenario');
  const clozeOk = !cloze || inReview(getCard(cloze.id));
  const scenOk = !scen || inReview(getCard(scen.id));
  if (clozeOk && scenOk && recall.stability >= SOLID_STABILITY_DAYS) return 'solid';
  return 'graduated';
}

export function stagesByFormula(deck, getCard) {
  const byF = new Map();
  for (const c of deck) { const k = c.formula.id; if (!byF.has(k)) byF.set(k, []); byF.get(k).push(c); }
  const out = new Map();
  for (const [id, fcards] of byF) out.set(id, formulaStage(fcards, getCard));
  return out;
}

export function countStages(map) {
  const n = { new: 0, learning: 0, graduated: 0, solid: 0 };
  for (const s of map.values()) n[s]++;
  return n;
}

export function stageDiff(before, after) {
  const rank = Object.fromEntries(STAGES.map((s, i) => [s, i]));
  const out = { met: [], graduated: [], solid: [] };
  for (const [id, s] of after) {
    const b = before.get(id) || 'new';
    if (rank[s] <= rank[b]) continue;
    if (s === 'learning') out.met.push(id);
    else if (s === 'graduated') out.graduated.push(id);
    else if (s === 'solid') out.solid.push(id);
  }
  return out;
}
```

- [ ] **Step 4: Run to verify pass** — `node --test test/` all green.
- [ ] **Step 5: Commit** — `git add js/guide.js test/ && git commit -m "guide: derive formula stages from FSRS card states"`

---

### Task 2: Session composer (`js/guide.js`)

**Interfaces:**
- Produces: `composeSession({ deck, getCard, isDue, budget, rng }) -> { queue: Card[], phaseOf: Map<cardId, 'recall'|'meet'|'deepen'|'tell'>, counts: {recall, meet, deepen, tell} }`. `isDue(id)` and `getCard(id)` injected; `rng` defaults to `Math.random`. Deck order is the introduction order.
- Produces: `PHASE_LABEL = { recall: 'Recall', meet: 'Meet', deepen: 'Deepen', tell: 'Tell apart' }`.

- [ ] **Step 1: Failing tests** (`test/guide.compose.test.mjs`)

```js
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
```

- [ ] **Step 2: Run, expect FAIL** (`composeSession` not exported).
- [ ] **Step 3: Implement**

```js
export const PHASE_LABEL = { recall: 'Recall', meet: 'Meet', deepen: 'Deepen', tell: 'Tell apart' };
const DEEPEN_KINDS = new Set(['use', 'symbols', 'why']);

function shuffleWith(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

export function composeSession({ deck, getCard, isDue, budget, rng = Math.random }) {
  const stages = stagesByFormula(deck, getCard);
  const isNew = id => !getCard(id);
  const settled = id => ['graduated', 'solid'].includes(stages.get(id));

  const recall = deck.filter(c => c.kind !== 'scenario' && !isNew(c.id) && isDue(c.id));
  const dueTell = deck.filter(c => c.kind === 'scenario' && !isNew(c.id) && isDue(c.id));
  const tellNew = deck.filter(c => c.kind === 'scenario' && isNew(c.id) && settled(c.formula.id));
  const deepenNew = deck.filter(c => DEEPEN_KINDS.has(c.kind) && isNew(c.id) && settled(c.formula.id));
  const meetPairs = [];
  for (const c of deck) {
    if (c.kind !== 'recall' || stages.get(c.formula.id) !== 'new') continue;
    const cloze = deck.find(x => x.kind === 'cloze' && x.formula.id === c.formula.id);
    meetPairs.push(cloze ? [c, cloze] : [c]);
  }

  let left = Math.max(0, budget);
  const firstPool = [...tellNew, ...deepenNew];
  const firstTake = firstPool.slice(0, Math.min(Math.ceil(left / 2), firstPool.length));
  left -= firstTake.length;
  const meet = [];
  for (const pair of meetPairs) {
    if (left <= 0) break;
    const take = pair.slice(0, left); meet.push(...take); left -= take.length;
  }
  const rest = firstPool.slice(firstTake.length).slice(0, left);
  const extra = [...firstTake, ...rest];
  const tell = [...dueTell, ...extra.filter(c => c.kind === 'scenario')];
  const deepen = extra.filter(c => c.kind !== 'scenario');

  const phaseOf = new Map();
  recall.forEach(c => phaseOf.set(c.id, 'recall'));
  meet.forEach(c => phaseOf.set(c.id, 'meet'));
  deepen.forEach(c => phaseOf.set(c.id, 'deepen'));
  tell.forEach(c => phaseOf.set(c.id, 'tell'));
  const meetRecall = meet.filter(c => c.kind === 'recall'), meetCloze = meet.filter(c => c.kind !== 'recall');
  const queue = [...shuffleWith(recall, rng), ...shuffleWith(meetRecall, rng), ...shuffleWith(meetCloze, rng), ...shuffleWith([...deepen, ...tell], rng)];
  return { queue, phaseOf, counts: { recall: recall.length, meet: meet.length, deepen: deepen.length, tell: tell.length } };
}
```

- [ ] **Step 4: Run, expect PASS.** Fix ordering assertions if `firstTake` shuffles differently; the ordering test only checks block boundaries.
- [ ] **Step 5: Commit** — `guide: compose the guided session in phases`

---

### Task 3: Hint ladder, nudges, automatic rating, snapshots (`js/guide.js`)

**Interfaces:**
- `hintLadder(card) -> Array<{ type: 'meaning'|'symbols'|'symbolsFull'|'cloze'|'name'|'when', ... }>` per the spec table. `symbols` carries `symbols: string[]` (latex only); `symbolsFull` carries `[[latex, meaning]]`; `cloze` carries `latex` (the raw cloze source, the app renders the front); `name` and `when` and `meaning` carry `text`.
- `autoRating(hints) -> null | 2 | 1` (null means learner grades; 2 = Hard; 1 = Again).
- `NUDGES: [{ text, reason }]` (3 entries); `nudgeFor(i) -> NUDGES[i % 3]`.
- `buildSnapshot(stageCounts, reviewCards) -> { stages, avgInterval }` where `reviewCards` are hydrated cards; avgInterval = mean `scheduled_days` of cards in Review, rounded to 1 decimal, `null` if none.
- `pruneSnapshots(snapshots, todayKey, keepDays = 60) -> snapshots` (new object, keys older than keepDays removed; keys are `YYYY-MM-DD`).
- `revealLine(hints) -> string|null`: `null` for 0, "You got there with a nudge. It will come back soon." for 1, "Not yet, and that is fine. Seeing the answer right after a real try is how it sticks." for 2+.

- [ ] **Step 1: Failing tests** (`test/guide.hints.test.mjs`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hintLadder, autoRating, nudgeFor, NUDGES, buildSnapshot, pruneSnapshots, revealLine } from '../js/guide.js';
import { State } from '../js/scheduler.js';

const formula = { id: 'mean', name: 'Mean', meaning: 'Balance point.', when: 'Use for averages.', symbols: [['\\mu', 'population mean'], ['N', 'size']], cloze: '\\bar{x} = \\frac{\\blank{\\sum x}}{n}' };
const card = kind => ({ id: `mean:${kind}`, kind, formula });

test('recall ladder is meaning, symbol names, cloze skeleton', () => {
  assert.deepEqual(hintLadder(card('recall')).map(h => h.type), ['meaning', 'symbols', 'cloze']);
  assert.deepEqual(hintLadder(card('recall'))[1].symbols, ['\\mu', 'N']);
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
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**

```js
export function hintLadder(card) {
  const f = card.formula;
  const meaning = { type: 'meaning', text: f.meaning };
  const when = { type: 'when', text: f.when };
  const name = { type: 'name', text: f.name };
  const hasSym = Array.isArray(f.symbols) && f.symbols.length > 0;
  switch (card.kind) {
    case 'recall': return [meaning, ...(hasSym ? [{ type: 'symbols', symbols: f.symbols.map(s => s[0]) }] : []), { type: 'cloze', latex: f.cloze }];
    case 'cloze': return [meaning, ...(hasSym ? [{ type: 'symbolsFull', symbols: f.symbols }] : [])];
    case 'use': return [name, when];
    case 'symbols': return [name, meaning];
    case 'why': return [meaning, when];
    default: return [];
  }
}

export function autoRating(hints) { return hints <= 0 ? null : hints === 1 ? 2 : 1; }

export function revealLine(hints) {
  if (hints <= 0) return null;
  if (hints === 1) return 'You got there with a nudge. It will come back soon.';
  return 'Not yet, and that is fine. Seeing the answer right after a real try is how it sticks.';
}

export const NUDGES = [
  { text: 'Say it out loud this time.', reason: 'Saying material aloud makes it more memorable than reading it silently (the production effect).' },
  { text: 'Write it down this time, on paper or in the pad below.', reason: 'A written answer is a commitment. It keeps your self-grading honest, which is what keeps the schedule accurate.' },
  { text: 'Picture it in your head this time.', reason: 'Retrieving silently strengthens memory as much as writing it out. What matters is the attempt.' },
];
export const nudgeFor = i => NUDGES[((i % NUDGES.length) + NUDGES.length) % NUDGES.length];

export function buildSnapshot(stages, cards) {
  const rev = cards.filter(c => c && c.state === State.Review);
  const avg = rev.length ? Math.round(rev.reduce((a, c) => a + (c.scheduled_days || 0), 0) / rev.length * 10) / 10 : null;
  return { stages: { ...stages }, avgInterval: avg };
}

export function pruneSnapshots(snapshots, todayKey, keepDays = 60) {
  const cutoff = new Date(todayKey + 'T00:00:00'); cutoff.setDate(cutoff.getDate() - keepDays);
  const out = {};
  for (const k of Object.keys(snapshots || {})) if (new Date(k + 'T00:00:00') >= cutoff) out[k] = snapshots[k];
  return out;
}
```

- [ ] **Step 4: Run all tests, expect PASS.**
- [ ] **Step 5: Commit** — `guide: hint ladder, nudges, automatic rating, snapshots`

---

### Task 4: Storage additions (`js/store.js`)

**Files:** Modify `js/store.js`; Test `test/store.test.mjs`.

**Interfaces:** `DEFAULT_SETTINGS` gains `introSeen: false`, `showPad: true`. `loadState`/`importState`/`resetState` results gain `snapshots: {}`. `exportState` includes `snapshots`.

- [ ] **Step 1: Failing test**

```js
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
```

Note: `store.js` touches `localStorage` only inside functions, so importing it under Node is safe.

- [ ] **Step 2: Run, expect FAIL.** **Step 3:** add the fields in `DEFAULT_SETTINGS`, `loadState`, `importState`. **Step 4:** PASS. **Step 5:** Commit `store: introSeen, showPad, snapshots`.

---

### Task 5: Scratchpad component (`js/pad.js`)

**Files:** Create `js/pad.js`; CSS in `css/style.css`. Browser-tested in Task 12.

**Interfaces:** `createPad(container, { height = 150 }) -> { hasInk(): boolean, clear(): void, toDataURL(): string|null, destroy(): void }`. Renders `<div class="pad"><canvas aria-label="Scratchpad: write your answer here"></canvas><div class="pad-bar"><span class="muted">Write your answer here</span><button class="btn btn-small" type="button">Clear</button></div></div>`. Uses Pointer Events (`pointerdown/move/up`, `touch-action: none`, `setPointerCapture`), devicePixelRatio-aware canvas sizing on creation and on `resize`, stroke color from `getComputedStyle(document.documentElement).getPropertyValue('--ink')`, 2.5px round-cap lines. `toDataURL()` returns `null` when `hasInk()` is false.

- [ ] **Step 1:** Write `js/pad.js` per the interface. **Step 2:** Add CSS: `.pad { margin-top: 12px; border: 2px dashed var(--line); border-radius: 12px; background: var(--paper); overflow: hidden; } .pad canvas { display: block; width: 100%; touch-action: none; cursor: crosshair; } .pad-bar { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px 6px 12px; }`. **Step 3:** Commit `pad: scratchpad canvas component`.

---

### Task 6: The recall loop in `js/app.js`

**Files:** Modify `js/app.js` (`frontHTML`, `renderStudy`, `onKey`, `onGrade`, `applyGrade`), `css/style.css`.

**Interfaces:**
- Consumes `hintLadder`, `autoRating`, `revealLine`, `nudgeFor` from `guide.js`; `createPad` from `pad.js`.
- Session state gains `hints: 0`, `pad: null`, `sketch: null`, `shown: 0` (cards shown this session, drives the nudge rotation).
- `applyGrade(card, rating, hints = 0)` records `hints` in the log entry.

- [ ] **Step 1: Prompt copy.** In `frontHTML`, recall becomes `What's the formula for <strong>${name}</strong>?`; cloze `Fill in the blank.`; use `What does this compute, and when do you use it?`; symbols `What does each symbol stand for?`; why unchanged. Add, when `isNew(card.id)` and kind is not scenario: `<p class="meet">You haven't met this one yet. Guess anyway, even a rough one. A guess, even a wrong one, makes the answer stick.</p>`. Add the nudge: `<p class="nudge">${nudgeFor(session.shown).text}</p>` for non-scenario cards.
- [ ] **Step 2: Hints.** Below the prompt, render shown hints: `<ol class="hints">` with one `<li>` per hint taken, rendering by type: `meaning`/`when`/`name` as text with a small label ("What it computes", "When to use it", "It's called"); `symbols` as inline KaTeX chips "It uses: μ, N"; `symbolsFull` as the `.symbols` grid; `cloze` as `texLines([clozeFront(h.latex)])`. Buttons when not revealed: `<div class="row answer-row"><button class="btn btn-primary" id="reveal">I have an answer</button><button class="btn" id="hint">${hints < ladder.length ? 'Give me a hint' : 'Show me'}</button></div>` (when ladder is empty, omit the hint button). "Show me" sets `hints = max(hints, 2)` and reveals.
- [ ] **Step 3: Scratchpad.** When `state.settings.showPad` and the card is not scenario and not revealed, render `<div id="padhost"></div><p class="hint"><a href="#" id="hidepad">Hide pad</a></p>` and call `createPad($('#padhost'))` after `view.innerHTML` is set; keep `session.pad`. Re-renders while unrevealed must preserve the ink: before re-rendering, capture `session.sketch = session.pad?.toDataURL()` and after creating the new pad, draw the saved image back (add `restore(dataURL)` to the pad interface). When `showPad` is false, show `<p class="hint"><a href="#" id="showpad">Show writing pad</a></p>`. On reveal, if `session.sketch`, render `<div class="compare"><figure><figcaption>Your answer</figcaption><img src="${sketch}" alt="Your handwritten answer"></figure><figure><figcaption>The formula</figcaption>${texLines(f.latex,'math math-lg')}</figure></div>` ahead of the back content, and the back content omits its own formula line for recall cards to avoid showing it twice.
- [ ] **Step 4: Reveal and grading.** After reveal, prepend `<p class="aloud">Read it aloud once.</p>` and, if `revealLine(session.hints)`, `<p class="reveal-line">…</p>`. If `autoRating(session.hints)` is non-null, render one button `<div class="grade one"><button class="btn g-next" data-grade="${auto}" data-auto="1">Next<small>back ${due(auto)}</small></button></div>` instead of the grade buttons. Rename buttons: "Forgot" → "Not yet". `onGrade` passes `session.hints` to `applyGrade`.
- [ ] **Step 5: Keyboard.** `h` taps hint when unrevealed; when a `[data-auto]` button is present, space/Enter clicks it and digit keys do nothing.
- [ ] **Step 6: CSS.** `.meet { margin-top: 8px; color: var(--ink-2); font-size: 15px; } .nudge { margin-top: 10px; font-size: 14px; color: var(--pen); font-weight: 700; } .hints { margin: 12px 0 0; padding: 0 0 0 18px; display: grid; gap: 8px; color: var(--ink-2); font-size: 15px; } .hints .lbl { display: block; font-size: 12px; color: var(--ink-3); } .answer-row { margin-top: 14px; } .answer-row .btn-primary { flex: 1; width: auto; } .compare { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; } .compare figure { margin: 0; } .compare figcaption { font-size: 13px; color: var(--ink-3); margin-bottom: 4px; } .compare img { width: 100%; border: 1px solid var(--line); border-radius: 10px; background: var(--paper); } .aloud { font-size: 13px; color: var(--ink-3); } .reveal-line { margin-top: 6px; color: var(--ink-2); font-size: 15px; } .g-next { background: var(--pen-soft); color: var(--pen); } @media (max-width: 420px) { .compare { grid-template-columns: 1fr; } }`
- [ ] **Step 7:** Open the page in the browser (Task 12 harness) and walk Scenario 2 and 4 from the spec. Commit `study: recall loop with hints, scratchpad, honest grading`.

---

### Task 7: Today route, wrap-up, first-visit redirect

**Files:** Modify `js/app.js`, `index.html`.

- [ ] **Step 1: Tabs.** `index.html` nav becomes: Today (`#today`), Study (`#study`), Which formula? (`#drill`), Formulas (`#sheet`), Progress (`#progress`), How it works (`#method`), gear (`#settings`). Brand link goes to `#today`.
- [ ] **Step 2: Session start.** `startSession(mode)`: when `mode === 'today'`, call `composeSession({ deck: DECK, getCard: cardState, isDue, budget: newAllowance() })`, set `session.queue`, `session.phaseOf`, `session.counts`, and `session.stagesBefore = stagesByFormula(DECK, cardState)`. Title "Today". The phase pill: in `cardHeader`, if `session.phaseOf?.has(card.id)` render `<span class="phase phase-${p}">${PHASE_LABEL[p]}</span>` before the kind label. Session head gets `<div class="phases">` listing the four phases with remaining counts (count of queue cards per phase).
- [ ] **Step 3: Wrap-up.** In `renderStudy` when the queue is empty and `session.mode === 'today'` and `session.done > 0`: compute `after = stagesByFormula(DECK, cardState)`, `diff = stageDiff(session.stagesBefore, after)`, write the snapshot (`state.snapshots[todayKey] = buildSnapshot(countStages(after), seenHydratedCards)`, prune, persist) and render: heading "Session done", big count, three stat tiles (met / graduated / solid today, with formula names listed under each when non-empty), the mini pipeline (reuse Task 9's `pipelineHTML`), next-due line, the encouragement line `Tomorrow's review will be shorter than you expect. That is spacing doing its work.`, and the two buttons.
- [ ] **Step 4: Routing.** `views` adds `today` and `method`; default route `today`. First visit: in `navigate()`, if `!state.settings.introSeen && (hash === '' || hash === 'today')`, set route to `method`. `renderMethod` (Task 8) sets `introSeen = true` and persists when it renders.
- [ ] **Step 5:** Browser-walk Scenario 1 and the wrap-up. Commit `today: guided session, wrap-up, first-visit intro`.

---

### Task 8: How it works (`js/method.js`, CSS)

**Files:** Create `js/method.js`; modify `js/app.js` (import, `renderMethod` route), `css/style.css`.

**Interfaces:** `export const REFERENCES: Array<{ id, authors, year, title, journal, doi }>` and `export function methodHTML({ started }) -> string`; `export function forgettingCurveSVG() -> string`.

- [ ] **Step 1: References data.** Exactly the 22 verified papers plus Mayer 2009 (book). Fields copied from the DOI resolutions recorded in the conversation on 2026-10-20 (APA strings). Reference numbers are assigned by array order and cited inline as `<sup><a href="#ref-N">N</a></sup>`.
- [ ] **Step 2: Content.** Sections per spec: one line; the four steps with mock cards (pure CSS `.mock` blocks); seven "Why it works" sections, each `<section class="why"><h3>claim</h3><p class="evidence">what the research found, cited</p><p class="applied"><strong>In the app:</strong> …</p></section>`; the pipeline explanation; the forgetting curve figure; references `<ol class="refs">` with `<li id="ref-N">APA text <a href="https://doi.org/…">doi:…</a></li>`; the primary button.
- [ ] **Step 3: Forgetting curve.** Static inline SVG, 560×220 viewBox, one 2px line in `var(--pen)`: recall probability `R(t) = (1 + t/(9S))^-1` plotted over 30 days with reviews at days 1, 3, 8, 18 where S grows ×2.5 each time; dashed grey line showing no-review decay from day 0 for contrast, labelled "without review"; review points as 8px circles with a surface ring; axes recessive (`var(--line)`), labels in `var(--ink-3)`; direct labels, no legend box; `<title>` and `<desc>` for accessibility; a `<table class="sr-only">` with the sampled values for screen readers.
- [ ] **Step 4: CSS.** `.method h2 { font-size: 22px; margin-top: 28px; } .steps { display: grid; gap: 14px; } .step { display: grid; grid-template-columns: 56px 1fr; gap: 14px; align-items: start; } .step b.n { font-size: 28px; color: var(--pen); line-height: 1; } .why { padding: 16px 0; border-top: 1px solid var(--line); } .why h3 { font-size: 17px; } .evidence { margin-top: 6px; color: var(--ink-2); } .applied { margin-top: 8px; } .refs { font-size: 14px; color: var(--ink-2); padding-left: 22px; display: grid; gap: 8px; } .refs li::marker { color: var(--ink-3); } .refs a { word-break: break-all; } sup a { text-decoration: none; font-weight: 700; } .figure { margin: 12px 0 0; } .figure svg { width: 100%; height: auto; } .figure figcaption { font-size: 13px; color: var(--ink-3); margin-top: 6px; } .sr-only { position: absolute; left: -9999px; }`
- [ ] **Step 5:** Render, read every sentence once against its citation, commit `method: how it works, with references`.

---

### Task 9: Progress — pipeline and momentum

**Files:** Modify `js/app.js` (`renderProgress`, new `pipelineHTML(counts)`), `css/style.css`.

- [ ] **Step 1:** `pipelineHTML(counts)` renders four `.stage` tiles (label, count, "formulas") in a row with a stacked bar beneath (`.pipe` with four `<i>` segments sized by count, colours: New `var(--line)`, Learning `var(--hard)`, Graduated `var(--pen)`, Solid `var(--good)`, 2px gaps). Insert as the first panel in Progress, heading "Where your formulas are".
- [ ] **Step 2: Momentum panel.** Reviews per day for the last 14 days from `state.sessions` as 14 thin bars (`.spark`), labelled with the first and last date only, and a sentence: average interval today vs the snapshot 7 days ago (`Review cards now come back every X days on average, up from Y a week ago.`; if no 7-day snapshot, `…every X days on average. Check back next week to see the gap grow.`; if no review cards yet, omit).
- [ ] **Step 3:** Stage chip on each predicted-recall row: `<span class="chip chip-stage-${stage}">${STAGE_LABEL[stage]}</span>`.
- [ ] **Step 4:** CSS: `.stages { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; } .stage { background: var(--paper); border-radius: 10px; padding: 8px 10px; } .stage b { display: block; font-size: 24px; } .stage span { font-size: 12px; color: var(--ink-2); } .pipe { display: flex; gap: 2px; height: 10px; margin-top: 10px; border-radius: 5px; overflow: hidden; } .pipe i { display: block; height: 100%; } .spark { display: flex; align-items: flex-end; gap: 3px; height: 48px; margin-top: 8px; } .spark i { flex: 1; background: var(--pen); border-radius: 2px 2px 0 0; min-height: 2px; } .chip-stage-new { background: var(--line); color: var(--ink-2); } .chip-stage-learning { background: var(--hard-soft); color: var(--hard); } .chip-stage-graduated { background: var(--pen-soft); color: var(--pen); } .chip-stage-solid { background: var(--good-soft); color: var(--good); }`
- [ ] **Step 5:** Commit `progress: stage pipeline and momentum`.

---

### Task 10: See it explained links (`js/cards.js`, `js/app.js`)

**Files:** Modify `js/cards.js` (add `links` where the curation agent verified a URL; add a header comment "links curated and verified live 2026-10-20"), `js/app.js` (`linksHTML(f)` rendered in `backHTML` for recall/use/scenario and in the sheet).

- [ ] **Step 1:** `linksHTML(f)` → `''` when no links, else `<p class="links">See it explained: ${f.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a>`).join(' · ')}</p>`. CSS `.links { margin-top: 10px; font-size: 14px; }`.
- [ ] **Step 2:** Re-verify every URL with `curl -sL -o /dev/null -w "%{http_code}"` before committing. Commit `cards: curated explainer links`.

---

### Task 11: Adversarial content review (gate)

- [ ] **Step 1:** Dispatch a fresh reviewer agent with: the rendered text of How it works (every claim with its reference numbers), the full `REFERENCES` array, the card copy (meet line, nudges and reasons, reveal lines, wrap-up encouragement), and the instruction to check each claim against the cited paper's abstract (via DOI page or publisher abstract), labelling each VERIFIED, OVERSTATED (with the accurate wording), MISATTRIBUTED, or UNVERIFIABLE; and to flag any sentence that is not both encouraging and true.
- [ ] **Step 2:** Fix every OVERSTATED/MISATTRIBUTED finding in `method.js`/`guide.js`; drop any UNVERIFIABLE claim. Re-run unit tests.
- [ ] **Step 3:** Record the review outcome in STATUS.md. Commit `method: content review fixes`.

---

### Task 12: Browser verification, docs, publish

- [ ] **Step 1:** Serve locally (`python -m http.server 8123` from the repo) and drive with Playwright MCP at 390×844 and 1100×800, light and dark (`emulate_media`), fresh localStorage each run: first visit → How it works; Start → Today; first card shows meet line, nudge, pad, both buttons; draw on the pad, reveal, comparison present; a card with two hints shows Next and the reveal line; a scenario card still grades on pick; finish a session → wrap-up with pipeline; Progress shows pipeline and momentum; How it works has 23 references each with a doi.org link; console has no errors; `document.documentElement.scrollWidth <= innerWidth`.
- [ ] **Step 2:** Update README.md (How it works, Today, scratchpad, hints) and STATUS.md (state table, how the app is organised, Spec A done, Specs B and C banked, review outcome).
- [ ] **Step 3:** Fresh-agent code review of the whole diff; fix what is confirmed.
- [ ] **Step 4:** `node --test test/` green; commit; `git push`; verify live: 200 on `/`, `/js/guide.js`, `/js/method.js`; 404 on `/Statistics.pdf`.
