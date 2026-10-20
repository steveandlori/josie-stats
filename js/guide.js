// Pure session logic for the guided loop: formula stages, session composition,
// hint ladder, nudges, automatic rating, snapshots. No DOM. Unit-tested in test/.
import { State } from './scheduler.js';

/* ───────────────────────── formula stages ───────────────────────── */

export const STAGES = ['new', 'learning', 'graduated', 'solid'];
export const STAGE_LABEL = { new: 'New', learning: 'Learning', graduated: 'Graduated', solid: 'Solid' };
const SOLID_STABILITY_DAYS = 7;

const inReview = c => !!c && c.state === State.Review;

// A formula's stage is read off its cards' FSRS states; nothing extra is stored.
export function formulaStage(fcards, getCard) {
  const recallCard = fcards.find(c => c.kind === 'recall');
  const recall = recallCard ? getCard(recallCard.id) : null;
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
  for (const c of deck) {
    const k = c.formula.id;
    if (!byF.has(k)) byF.set(k, []);
    byF.get(k).push(c);
  }
  const out = new Map();
  for (const [id, fcards] of byF) out.set(id, formulaStage(fcards, getCard));
  return out;
}

export function countStages(map) {
  const n = { new: 0, learning: 0, graduated: 0, solid: 0 };
  for (const s of map.values()) n[s]++;
  return n;
}

// Formulas that advanced between two stage maps, grouped by the stage they reached.
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

/* ───────────────────────── session composer ───────────────────────── */

export const PHASE_LABEL = { recall: 'Recall', meet: 'Meet', deepen: 'Deepen', tell: 'Tell apart' };
const DEEPEN_KINDS = new Set(['use', 'symbols', 'why']);

function shuffleWith(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// Builds today's guided queue in phases: recall (due), meet (new formulas as recall+cloze pairs),
// deepen (use/symbols/why for graduated formulas) and tell apart (scenario cards).
// `budget` is the number of never-seen cards allowed today.
export function composeSession({ deck, getCard, isDue, budget, rng = Math.random }) {
  const stages = stagesByFormula(deck, getCard);
  const isNew = id => !getCard(id);
  const settled = fid => stages.get(fid) === 'graduated' || stages.get(fid) === 'solid';

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

  // Allocation: discrimination/deepening for graduated formulas gets up to half the budget first,
  // new formulas fill the rest, and anything left goes back to the first pool.
  let left = Math.max(0, budget);
  const firstPool = [...tellNew, ...deepenNew];
  const firstTake = firstPool.slice(0, Math.min(Math.ceil(left / 2), firstPool.length));
  left -= firstTake.length;
  const meet = [];
  for (const pair of meetPairs) {
    if (left <= 0) break;
    const take = pair.slice(0, left);
    meet.push(...take); left -= take.length;
  }
  const rest = firstPool.slice(firstTake.length, firstTake.length + left);
  const extra = [...firstTake, ...rest];
  const tell = [...dueTell, ...extra.filter(c => c.kind === 'scenario')];
  const deepen = extra.filter(c => c.kind !== 'scenario');

  const phaseOf = new Map();
  recall.forEach(c => phaseOf.set(c.id, 'recall'));
  meet.forEach(c => phaseOf.set(c.id, 'meet'));
  deepen.forEach(c => phaseOf.set(c.id, 'deepen'));
  tell.forEach(c => phaseOf.set(c.id, 'tell'));
  const meetRecall = meet.filter(c => c.kind === 'recall');
  const meetCloze = meet.filter(c => c.kind !== 'recall');
  const queue = [
    ...shuffleWith(recall, rng),
    ...shuffleWith(meetRecall, rng),
    ...shuffleWith(meetCloze, rng),
    ...shuffleWith([...deepen, ...tell], rng),
  ];
  return { queue, phaseOf, counts: { recall: recall.length, meet: meet.length, deepen: deepen.length, tell: tell.length } };
}

/* ───────────────────────── hint ladder, nudges, grading ───────────────────────── */

// Hints reveal the answer gradually (Finn & Metcalfe 2010). Each entry is data; the app renders it.
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

// A hinted answer grades itself: one hint = Hard (2), two or more = Again (1), none = learner grades.
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

/* ───────────────────────── snapshots (for the momentum view) ───────────────────────── */

export function buildSnapshot(stages, cards) {
  const rev = cards.filter(c => c && c.state === State.Review);
  const avg = rev.length ? Math.round(rev.reduce((a, c) => a + (c.scheduled_days || 0), 0) / rev.length * 10) / 10 : null;
  return { stages: { ...stages }, avgInterval: avg };
}

export function pruneSnapshots(snapshots, todayKey, keepDays = 60) {
  const cutoff = new Date(todayKey + 'T00:00:00');
  cutoff.setDate(cutoff.getDate() - keepDays);
  const out = {};
  for (const k of Object.keys(snapshots || {})) if (new Date(k + 'T00:00:00') >= cutoff) out[k] = snapshots[k];
  return out;
}
