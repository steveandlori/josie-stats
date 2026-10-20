// Progress and settings live in the browser (localStorage). Export/import moves them between devices.

const KEY = 'josie-stats-v1';

const DEFAULT_SETTINGS = {
  newPerDay: 10,
  fourButtons: false,
  midterm: '',   // YYYY-MM-DD
  final: '',     // YYYY-MM-DD
  retention: 0.9,
  introSeen: false, // How it works shown once on first visit
  showPad: true,    // scratchpad under recall prompts
};

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* storage unavailable */ }
  let s = {};
  if (raw) { try { s = JSON.parse(raw); } catch (e) { s = {}; } }
  return {
    settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) },
    cards: s.cards || {},          // cardId -> fsrs card (dates as ISO strings)
    log: s.log || [],              // {id, rating, at}
    newIntroduced: s.newIntroduced || {}, // dayKey -> [cardIds]
    sessions: s.sessions || {},    // dayKey -> count of reviews
    snapshots: s.snapshots || {},  // dayKey -> {stages, avgInterval}, written at wrap-up
  };
}

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch (e) { return false; }
}

export function exportState(state) {
  return JSON.stringify({ app: 'josie-stats', version: 1, exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function importState(text) {
  const s = JSON.parse(text);
  if (!s || s.app !== 'josie-stats') throw new Error('That file is not a Stats Cards progress file.');
  return {
    settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) },
    cards: s.cards || {},
    log: s.log || [],
    newIntroduced: s.newIntroduced || {},
    sessions: s.sessions || {},
    snapshots: s.snapshots || {},
  };
}

export function resetState() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  return loadState();
}

export { todayKey, DEFAULT_SETTINGS };
