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
