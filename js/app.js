import { FORMULAS, SCENARIOS, TOPICS } from './cards.js';
import * as store from './store.js';
import { makeScheduler, hydrate, dehydrate, emptyCard, grade, Rating, State, retrievability, nextExam, maxIntervalFor, daysUntil } from './scheduler.js';
import { STAGES, STAGE_LABEL, PHASE_LABEL, stagesByFormula, countStages, stageDiff, composeSession, hintLadder, autoRating, revealLine, nudgeFor, buildSnapshot, pruneSnapshots } from './guide.js';
import { createPad } from './pad.js';
import { methodHTML } from './method.js';

/* ───────────────────────── helpers ───────────────────────── */

const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function tex(latex, { display = true } = {}) {
  try {
    return katex.renderToString(latex, { displayMode: display, throwOnError: false, strict: false, trust: false });
  } catch (e) {
    return `<code>${esc(latex)}</code>`;
  }
}
const texLines = (lines, cls = 'math') => `<div class="${cls}">${lines.map(l => tex(l)).join('')}</div>`;

// \blank{...} → a boxed "?" on the front, a highlighted box on the back.
function splitBlank(src) {
  const i = src.indexOf('\\blank{');
  if (i < 0) return null;
  let depth = 0, j = i + 7;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { if (depth === 0) break; depth--; }
  }
  return { before: src.slice(0, i), inner: src.slice(i + 7, j), after: src.slice(j + 1) };
}
function clozeFront(src) {
  let out = src, p;
  while ((p = splitBlank(out))) out = `${p.before}\\boxed{\\;?\\;}${p.after}`;
  return out;
}
function clozeBack(src) {
  let out = src, p;
  while ((p = splitBlank(out))) out = `${p.before}\\textcolor{#1F4FD8}{\\boxed{${p.inner}}}${p.after}`;
  return out;
}

function seededShuffle(arr, seed) {
  // Mulberry32 — deterministic order so the "new card" sequence is stable.
  let a = seed >>> 0;
  const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function fmtDays(d) {
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  return `in ${d} days`;
}
function fmtDue(due, now = new Date()) {
  const ms = due - now;
  if (ms <= 0) return 'now';
  const min = Math.round(ms / 60000);
  if (min < 60) return `in ${min} min`;
  const days = Math.round(ms / 86400000);
  if (days < 1) return 'later today';
  return fmtDays(days);
}

/* ───────────────────────── deck ───────────────────────── */

const byId = Object.fromEntries(FORMULAS.map(f => [f.id, f]));
const PRI_RANK = { M: 0, C: 1, S: 2 };
const KIND_RANK = { recall: 0, use: 1, cloze: 2, scenario: 3, symbols: 4, why: 5 };
const KIND_LABEL = { recall: 'Name → formula', use: 'Formula → meaning', cloze: 'Fill in the blank', scenario: 'Which formula?', symbols: 'What the symbols mean', why: 'Why it works' };

function buildDeck() {
  const cards = [];
  for (const f of FORMULAS) {
    const base = { formula: f, topic: f.topic, priority: f.priority };
    cards.push({ ...base, id: `${f.id}:recall`, kind: 'recall' });
    cards.push({ ...base, id: `${f.id}:use`, kind: 'use' });
    cards.push({ ...base, id: `${f.id}:cloze`, kind: 'cloze' });
    if (f.symbols && f.symbols.length >= 2) cards.push({ ...base, id: `${f.id}:symbols`, kind: 'symbols' });
    if (f.why) cards.push({ ...base, id: `${f.id}:why`, kind: 'why' });
  }
  for (const s of SCENARIOS) {
    const f = byId[s.answer];
    cards.push({ id: `sc:${s.id}`, kind: 'scenario', formula: f, topic: f.topic, priority: f.priority, scenario: s });
  }
  // Introduction order: midterm-highlighted formulas first, recall cards before the rest,
  // formulas shuffled (deterministically) so new cards are mixed across topics.
  const fOrder = {};
  seededShuffle(FORMULAS.map(f => f.id), 20261019).forEach((id, i) => { fOrder[id] = i; });
  cards.forEach(c => { c.order = PRI_RANK[c.priority] * 1000 + KIND_RANK[c.kind] * 100 + fOrder[c.formula.id]; });
  cards.sort((a, b) => a.order - b.order);
  return cards;
}

const DECK = buildDeck();
const DECK_BY_ID = Object.fromEntries(DECK.map(c => [c.id, c]));

/* ───────────────────────── state ───────────────────────── */

let state = store.loadState();
let scheduler = makeScheduler(state.settings);
const now = () => new Date();

function persist() {
  if (!store.saveState(state)) toast('Could not save progress — is private browsing on?');
}
function cardState(id) { return hydrate(state.cards[id]); }
function isDue(id, at = now()) { const c = cardState(id); return c && c.due <= at; }
function isNew(id) { return !state.cards[id]; }

function newAllowance() {
  const used = (state.newIntroduced[store.todayKey()] || []).length;
  return Math.max(0, state.settings.newPerDay - used);
}

function dueCards(at = now()) {
  return DECK.filter(c => isDue(c.id, at)).sort((a, b) => cardState(a.id).due - cardState(b.id).due);
}
function newCards(limit) {
  return DECK.filter(c => isNew(c.id)).slice(0, limit);
}

function applyGrade(card, rating, hints = 0) {
  const at = now();
  const prev = cardState(card.id) || emptyCard(at);
  const wasNew = isNew(card.id);
  const r = grade(scheduler, prev, rating, at);
  state.cards[card.id] = dehydrate(r.card);
  state.log.push({ id: card.id, rating, at: at.toISOString(), hints });
  if (state.log.length > 5000) state.log = state.log.slice(-5000);
  const day = store.todayKey(at);
  state.sessions[day] = (state.sessions[day] || 0) + 1;
  if (wasNew) (state.newIntroduced[day] = state.newIntroduced[day] || []).push(card.id);
  persist();
  return r.card;
}

/* ───────────────────────── rendering: card faces ───────────────────────── */

function chip(p) {
  const label = { M: 'midterm / final', C: 'core', S: 'later' }[p];
  return `<span class="chip chip-${p}">${label}</span>`;
}

function cardHeader(card, phase = null) {
  const ph = phase ? `<span class="phase ph-${phase}">${PHASE_LABEL[phase]}</span>` : '';
  return `<div class="card-meta"><span class="topic">${esc(TOPICS[card.topic])}</span>${chip(card.priority)}${ph}<span class="card-kind">${KIND_LABEL[card.kind]}</span></div>`;
}

function frontHTML(card) {
  const f = card.formula;
  switch (card.kind) {
    case 'recall':
      return `<div class="prompt">What\u2019s the formula for <strong>${esc(f.name)}</strong>?</div>`;
    case 'use':
      return `<div class="prompt">What does this compute, and when do you use it?${texLines(f.latex, 'math math-lg')}</div>`;
    case 'cloze':
      return `<div class="prompt">Fill in the blank. <span class="muted">${esc(f.name)}</span>${texLines([clozeFront(f.cloze)], 'math math-lg')}</div>`;
    case 'symbols':
      return `<div class="prompt">What does each symbol stand for?${texLines(f.latex, 'math math-lg')}</div>`;
    case 'why':
      return `<div class="prompt">${esc(f.whyQ)}${texLines(f.latex, 'math')}</div>`;
    case 'scenario':
      return `<div class="prompt scenario">${esc(card.scenario.text)}</div><p class="muted" style="margin-top:8px">Which formula do you reach for?</p>`;
  }
}

function sourceHTML(f) {
  return `<p class="source">Verified against <a href="${esc(f.source.url)}" target="_blank" rel="noopener">${esc(f.source.name)}</a></p>`;
}
function linksHTML(f) {
  if (!f.links || !f.links.length) return '';
  return `<p class="links">See it explained: ${f.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a>`).join('<span class="sep"> \u00b7 </span>')}</p>`;
}
function noteHTML(f) {
  return f.note ? `<div class="callout"><strong>Check your notes:</strong> ${esc(f.note)}</div>` : '';
}

function backHTML(card, { omitFormula = false } = {}) {
  const f = card.formula;
  const meaningBlock = `<h3>What it means</h3><p class="text">${esc(f.meaning)}</p><h3>When to use it</h3><p class="text">${esc(f.when)}</p>`;
  switch (card.kind) {
    case 'recall':
      return `${omitFormula ? '' : texLines(f.latex, 'math math-lg')}${meaningBlock}${noteHTML(f)}${linksHTML(f)}${sourceHTML(f)}`;
    case 'use':
      return `<h3>${esc(f.name)}</h3>${meaningBlock}${noteHTML(f)}${linksHTML(f)}${sourceHTML(f)}`;
    case 'cloze':
      return `${texLines([clozeBack(f.cloze)], 'math math-lg')}${omitFormula ? '' : `<h3>Full formula</h3>${texLines(f.latex, 'math')}`}${noteHTML(f)}${sourceHTML(f)}`;
    case 'symbols':
      return `<h3>${esc(f.name)}</h3><ul class="symbols">${f.symbols.map(([s, m]) => `<li>${tex(s, { display: false })}</li><li>${esc(m)}</li>`).join('')}</ul>${sourceHTML(f)}`;
    case 'why':
      return `<p class="text">${esc(f.why)}</p>${sourceHTML(f)}`;
    case 'scenario':
      return `<h3>${esc(f.name)}</h3>${texLines(f.latex, 'math math-lg')}<h3>Why this one</h3><p class="text">${esc(f.when)}</p>${linksHTML(f)}${sourceHTML(f)}`;
  }
}

/* ───────────────────────── study session ───────────────────────── */

const session = {
  queue: [], done: 0, total: 0, mode: 'today', revealed: false, current: null, choices: null, picked: null,
  hints: 0,          // hints taken on the current card
  pad: null,         // live scratchpad component, if shown
  sketch: null,      // data URL of the learner's drawing, kept across re-renders and shown at reveal
  shown: 0,          // cards shown this session; drives the nudge rotation
  phaseOf: null,     // Map cardId -> phase (Today only)
  counts: null,      // cards per phase at session start (Today only)
  stagesBefore: null // formula stages at session start (Today only), for the wrap-up
};

const MODE_TITLE = { today: 'Today', drill: 'Which formula?' };

function startSession(mode = 'today') {
  session.mode = mode;
  session.day = store.todayKey();
  session.done = 0; session.revealed = false; session.current = null;
  session.phaseOf = null; session.counts = null; session.stagesBefore = null;
  let cards;
  if (mode === 'drill') {
    cards = shuffle(DECK.filter(c => c.kind === 'scenario'));
  } else {
    const r = composeSession({ deck: DECK, getCard: cardState, isDue: id => isDue(id), budget: newAllowance() });
    cards = r.queue; session.phaseOf = r.phaseOf; session.counts = r.counts;
    session.stagesBefore = stagesByFormula(DECK, cardState);
  }
  session.queue = cards;
  session.total = cards.length;
  renderStudy();
}

function studyAhead(n = 10) {
  const at = now();
  const ahead = DECK.filter(c => !isNew(c.id) && !isDue(c.id, at)).sort((a, b) => cardState(a.id).due - cardState(b.id).due).slice(0, n);
  const extraNew = ahead.length < n ? newCards(n - ahead.length) : [];
  session.queue = shuffle([...ahead, ...extraNew]);
  session.total = session.done + session.queue.length;
  if (!session.queue.length) { toast('Nothing left to study ahead — every card is in rotation.'); return; }
  renderStudy();
}

// Shrink any display-math line that is wider than its container (phones).
function fitMath(root = document) {
  root.querySelectorAll('.math').forEach(box => {
    box.querySelectorAll('.katex-display').forEach(d => {
      let size = 100;
      while (d.scrollWidth > box.clientWidth + 1 && size > 60) { size -= 8; d.style.fontSize = size + '%'; }
    });
  });
}

function dropPad() {
  if (session.pad) { session.pad.destroy(); session.pad = null; }
}

function nextCard() {
  session.revealed = false; session.choices = null; session.picked = null;
  session.hints = 0; session.sketch = null;
  dropPad();
  session.current = session.queue.shift() || null;
  session.shown++;
  renderStudy();
}

function onGrade(rating) {
  const card = session.current;
  if (!card) return;
  const updated = applyGrade(card, rating, session.hints);
  session.done++;
  // Cards still in learning come back later in this same session.
  if (updated.state === State.Learning || updated.state === State.Relearning) {
    const pos = Math.min(session.queue.length, 3 + Math.floor(Math.random() * 3));
    session.queue.splice(pos, 0, card);
    session.total++;
  }
  nextCard();
}

function phaseStripHTML() {
  if (!session.phaseOf) return '';
  const left = { recall: 0, meet: 0, deepen: 0, tell: 0 };
  const pending = session.current ? [session.current, ...session.queue] : session.queue;
  for (const c of pending) { const p = session.phaseOf.get(c.id); if (p) left[p]++; }
  const cur = session.current && session.phaseOf.get(session.current.id);
  return `<div class="phases" aria-label="Today's phases">${Object.keys(PHASE_LABEL).filter(p => session.counts[p] > 0).map(p =>
    `<span class="ph${left[p] ? '' : ' is-done'}${cur === p ? ' now' : ''}">${PHASE_LABEL[p]}<b>${left[p]}</b></span>`).join('')}</div>`;
}

// Short plain-text version of the question for the expanded writing pad's top bar.
function padTitle(card) {
  const f = card.formula;
  switch (card.kind) {
    case 'recall': return `Formula for ${f.name}`;
    case 'cloze': return `Fill in the blank: ${f.name}`;
    case 'use': return 'What does this compute, and when?';
    case 'symbols': return 'What does each symbol stand for?';
    case 'why': return f.whyQ || f.name;
    default: return f.name;
  }
}

function hintHTML(h) {
  const lbl = t => `<span class="lbl">${t}</span>`;
  switch (h.type) {
    case 'meaning': return `<li>${lbl('What it computes')}${esc(h.text)}</li>`;
    case 'when': return `<li>${lbl('When to use it')}${esc(h.text)}</li>`;
    case 'name': return `<li>${lbl('It is called')}${esc(h.text)}</li>`;
    case 'symbols': return `<li>${lbl('It uses')}<span class="symrow">${h.symbols.map(s => tex(s, { display: false })).join('<span class="sep">, </span>')}</span></li>`;
    case 'symbolsFull': return `<li>${lbl('The symbols')}<ul class="symbols">${h.symbols.map(([s, m]) => `<li>${tex(s, { display: false })}</li><li>${esc(m)}</li>`).join('')}</ul></li>`;
    case 'cloze': return `<li>${lbl('The shape of it')}${texLines([clozeFront(h.latex)], 'math')}</li>`;
    default: return '';
  }
}

function renderStudy() {
  const view = $('#view');
  const card = session.current;
  const title = MODE_TITLE[session.mode] || 'Today';

  if (!card && !session.queue.length) {
    // Nothing queued: either session finished or nothing due.
    if (session.done > 0) {
      if (session.mode === 'today') { renderWrapUp(); return; }
      const next = DECK.filter(c => !isNew(c.id)).map(c => cardState(c.id).due).sort((a, b) => a - b)[0];
      view.innerHTML = `<div class="card done"><h2>Session done</h2><div class="big">${session.done}</div><p class="muted">cards answered</p>
        <p style="margin-top:14px">${next ? `Next cards come due ${fmtDue(next)}.` : ''} Come back tomorrow — spacing is what makes this stick.</p>
        <div class="row"><button class="btn" id="ahead">Study 10 more</button><a class="btn btn-quiet" href="#progress">See progress</a></div></div>`;
      $('#ahead').onclick = () => studyAhead(10);
      return;
    }
    const exam = nextExam(state.settings);
    const examLine = exam ? `<p class="muted">${exam.name[0].toUpperCase() + exam.name.slice(1)} ${fmtDays(exam.days)}.</p>` : '';
    const nothingNew = newAllowance() === 0;
    view.innerHTML = `<div class="card done"><h2>All caught up</h2>
      <p style="margin-top:10px">${nothingNew ? `You've met today's limit of ${state.settings.newPerDay} new cards and nothing is due yet.` : 'Nothing is due right now.'}</p>${examLine}
      <div class="row"><button class="btn" id="ahead">Study 10 more</button><a class="btn btn-quiet" href="#drill">Try the Which formula? drill</a></div></div>`;
    $('#ahead').onclick = () => studyAhead(10);
    return;
  }

  if (!card) { nextCard(); return; }

  const remaining = session.queue.length + 1;
  const pct = session.total ? Math.round((session.done / session.total) * 100) : 0;
  const isScenario = card.kind === 'scenario';
  const fresh = isNew(card.id);
  const ladder = isScenario ? [] : hintLadder(card);
  const phase = session.phaseOf ? session.phaseOf.get(card.id) : null;

  let body = `<div class="session-head"><h1>${title}</h1><span class="muted">${remaining} left</span><span class="spacer"></span>${fresh ? '<span class="muted">new card</span>' : ''}</div>
    <div class="progress"><i style="width:${pct}%"></i></div>${phaseStripHTML()}
    <section class="card t-${card.topic}" aria-live="polite">${cardHeader(card, phase)}${frontHTML(card)}`;

  if (!isScenario && fresh) body += `<p class="meet">You haven't met this one yet. Guess anyway, even a rough one. A guess, even a wrong one, helps the answer stick.</p>`;
  if (!isScenario && !session.revealed) body += `<p class="nudge">${esc(nudgeFor(session.shown).text)}</p>`;
  if (session.hints > 0) body += `<ol class="hints" aria-label="Hints">${ladder.slice(0, session.hints).map(hintHTML).join('')}</ol>`;

  if (isScenario) {
    if (!session.choices) {
      const s = card.scenario;
      session.choices = shuffle([s.answer, ...s.distractors]).map(id => byId[id]);
    }
    const keys = ['1', '2', '3', '4'];
    body += `<div class="choices">${session.choices.map((f, i) => {
      let res = '';
      if (session.revealed) res = f.id === card.scenario.answer ? ' data-result="right"' : (session.picked === f.id ? ' data-result="wrong"' : '');
      return `<button class="choice" data-pick="${f.id}"${res}${session.revealed ? ' disabled' : ''}><span class="key">${keys[i]}</span><span class="math">${tex(f.latex[0], { display: false })}${session.revealed ? `<span class="name">${esc(f.name)}</span>` : ''}</span></button>`;
    }).join('')}</div>`;
  }

  if (session.revealed) {
    const f = card.formula;
    const line = isScenario ? null : revealLine(session.hints);
    let top = isScenario ? '' : `<p class="aloud">Read it aloud once.</p>`;
    if (line) top += `<p class="reveal-line">${esc(line)}</p>`;
    let compare = '';
    if (session.sketch) {
      compare = `<div class="compare"><figure><figcaption>Your answer</figcaption><img src="${session.sketch}" alt="Your handwritten answer"></figure><figure><figcaption>The formula</figcaption>${texLines(f.latex, 'math math-lg')}</figure></div>`;
    }
    body += `<div class="answer">${top}${compare}${backHTML(card, { omitFormula: !!session.sketch })}</div>`;

    const four = state.settings.fourButtons;
    const preview = scheduler.repeat(cardState(card.id) || emptyCard(now()), now());
    const due = r => fmtDue(preview[r].card.due);
    const auto = isScenario ? null : autoRating(session.hints);
    if (isScenario) {
      const right = session.picked === card.scenario.answer;
      body += right
        ? `<div class="grade one"><button class="btn g-good" data-grade="3">Right — next<small>back ${due(3)}</small></button></div>`
        : `<div class="grade one"><button class="btn g-again" data-grade="1">Not this one — next<small>back ${due(1)}</small></button></div>`;
      body += `<p class="hint"><span class="kbd">space</span> next</p>`;
    } else if (auto !== null) {
      body += `<div class="grade one"><button class="btn g-next" data-grade="${auto}" data-auto="1">Next<small>back ${due(auto)}</small></button></div><p class="hint">Graded for you because you used a hint. <span class="kbd">space</span> next</p>`;
    } else {
      body += four
        ? `<div class="grade four"><button class="btn g-again" data-grade="1">Not yet<small>${due(1)}</small></button><button class="btn g-hard" data-grade="2">Hard<small>${due(2)}</small></button><button class="btn g-good" data-grade="3">Got it<small>${due(3)}</small></button><button class="btn g-easy" data-grade="4">Easy<small>${due(4)}</small></button></div>`
        : `<div class="grade"><button class="btn g-again" data-grade="1">Not yet<small>${due(1)}</small></button><button class="btn g-good" data-grade="3">Got it<small>${due(3)}</small></button></div>`;
      body += `<p class="hint"><span class="kbd">1</span> not yet &nbsp; <span class="kbd">${four ? '3' : '2'}</span> got it</p>`;
    }
  } else if (!isScenario) {
    if (state.settings.showPad) body += `<div id="padhost"></div><p class="hint"><a href="#" id="hidepad">Hide the writing pad</a></p>`;
    else body += `<p class="hint"><a href="#" id="showpad">Show a writing pad</a></p>`;
    body += `<div class="row answer-row"><button class="btn btn-primary" id="reveal">I have an answer</button>${ladder.length ? `<button class="btn" id="hint">${session.hints < ladder.length ? 'Give me a hint' : 'Show me'}</button>` : ''}</div>
      <p class="hint"><span class="kbd">space</span> answer &nbsp; <span class="kbd">h</span> hint</p>`;
  }
  body += '</section>';
  view.innerHTML = body;
  fitMath(view);

  const captureSketch = () => { if (session.pad) { session.sketch = session.pad.toDataURL(); dropPad(); } };
  const doReveal = () => { captureSketch(); session.revealed = true; renderStudy(); };
  const host = $('#padhost');
  if (host) {
    session.pad = createPad(host, { title: padTitle(card), onAnswer: doReveal });
    if (session.sketch) session.pad.restore(session.sketch);
  }

  const reveal = $('#reveal');
  if (reveal) reveal.onclick = doReveal;
  const hint = $('#hint');
  if (hint) hint.onclick = () => {
    captureSketch();
    if (session.hints < ladder.length) session.hints++;
    else { session.hints = Math.max(session.hints, 2); session.revealed = true; }
    renderStudy();
  };
  const hide = $('#hidepad');
  if (hide) hide.onclick = e => { e.preventDefault(); dropPad(); session.sketch = null; state.settings.showPad = false; persist(); renderStudy(); };
  const show = $('#showpad');
  if (show) show.onclick = e => { e.preventDefault(); state.settings.showPad = true; persist(); renderStudy(); };
  view.querySelectorAll('[data-grade]').forEach(b => { b.onclick = () => onGrade(Number(b.dataset.grade)); });
  view.querySelectorAll('[data-pick]').forEach(b => {
    b.onclick = () => {
      if (session.revealed) return;
      session.picked = b.dataset.pick;
      session.revealed = true;
      renderStudy(); // a right pick counts as "Got it", a wrong pick as "Forgot"
    };
  });
}

function renderWrapUp() {
  const view = $('#view');
  const after = stagesByFormula(DECK, cardState);
  const diff = stageDiff(session.stagesBefore || after, after);
  const day = store.todayKey();
  state.snapshots[day] = buildSnapshot(countStages(after), DECK.filter(c => !isNew(c.id)).map(c => cardState(c.id)));
  state.snapshots = pruneSnapshots(state.snapshots, day);
  persist();
  const next = DECK.filter(c => !isNew(c.id)).map(c => cardState(c.id).due).sort((a, b) => a - b)[0];
  const names = ids => ids.length ? `<ul class="moved">${ids.map(id => `<li>${esc(byId[id].name)}</li>`).join('')}</ul>` : '';
  const tile = (n, label, ids) => `<div class="stat"><b>${n}</b><span>${label}</span>${names(ids)}</div>`;
  view.innerHTML = `<div class="card done"><h2>Session done</h2><div class="big">${session.done}</div><p class="muted">cards answered</p>
    <div class="stats moved-stats">${tile(diff.met.length, diff.met.length === 1 ? 'formula met' : 'formulas met', diff.met)}${tile(diff.graduated.length, 'graduated', diff.graduated)}${tile(diff.solid.length, 'now solid', diff.solid)}</div>
    <div class="pipeline-wrap">${pipelineHTML(countStages(after))}</div>
    <p style="margin-top:14px">${next ? `Next cards come due ${fmtDue(next)}.` : ''} Coming back tomorrow matters more than doing more today. Spacing is a big part of what makes this stick.</p>
    <div class="row"><button class="btn" id="ahead">Study 10 more</button><a class="btn btn-quiet" href="#progress">See progress</a></div></div>`;
  $('#ahead').onclick = () => studyAhead(10);
}

function onKey(e) {
  if (route !== 'today' && route !== 'drill') return;
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target && /^(input|select|textarea|button|a)$/i.test(e.target.tagName)) return;
  const card = session.current;
  if (!card) return;
  if (!session.revealed) {
    if (card.kind === 'scenario' && /^[1-4]$/.test(e.key)) { const b = $(`#view .choice:nth-child(${e.key})`); if (b) b.click(); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); const b = $('#reveal'); if (b) b.click(); }
    else if (e.key === 'h' || e.key === 'H') { const b = $('#hint'); if (b) b.click(); }
    return;
  }
  const autoBtn = $('#view [data-auto]');
  if (card.kind === 'scenario' || autoBtn) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); const b = autoBtn || $('#view [data-grade]'); if (b) b.click(); }
    return;
  }
  const four = state.settings.fourButtons;
  const map = four ? { 1: 1, 2: 2, 3: 3, 4: 4 } : { 1: 1, 2: 3 };
  if (map[e.key]) { const b = $(`#view [data-grade="${map[e.key]}"]`); if (b && !b.disabled) b.click(); }
}

/* ───────────────────────── formula sheet ───────────────────────── */

function renderSheet() {
  const view = $('#view');
  const list = (filter = '') => {
    const q = filter.trim().toLowerCase();
    const groups = Object.keys(TOPICS).map(t => ({ t, items: FORMULAS.filter(f => f.topic === t && (!q || (f.name + ' ' + f.meaning + ' ' + f.when).toLowerCase().includes(q))) })).filter(g => g.items.length);
    if (!groups.length) return '<p class="muted">No formulas match.</p>';
    return groups.map(g => `<h3 class="topic-h h-${g.t}">${esc(TOPICS[g.t])}</h3><ul class="flist">${g.items.map(f => `<li>
      <div class="name">${esc(f.name)} ${chip(f.priority)}</div>
      ${texLines(f.latex, 'math')}
      <p class="text">${esc(f.meaning)}</p>
      <p class="text"><em>Use it when:</em> ${esc(f.when)}</p>
      ${noteHTML(f)}
      ${linksHTML(f)}
      ${sourceHTML(f)}</li>`).join('')}</ul>`).join('');
  };
  view.innerHTML = `<h1>Formula sheet</h1><p class="lead">All ${FORMULAS.length} formulas, each checked against the linked source. Pink means your notes mark it as midterm/final material.</p>
    <input class="search" id="q" type="search" placeholder="Search formulas" aria-label="Search formulas">
    <div class="panel" id="sheet">${list()}</div>`;
  fitMath(view);
  $('#q').oninput = e => { $('#sheet').innerHTML = list(e.target.value); fitMath(view); };
}

/* ───────────────────────── progress ───────────────────────── */

function streak() {
  let n = 0; const d = new Date();
  // Today counts if studied; otherwise start from yesterday.
  if (!state.sessions[store.todayKey(d)]) d.setDate(d.getDate() - 1);
  while (state.sessions[store.todayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// Four stage tiles and a stacked bar: how many formulas sit in each stage.
function pipelineHTML(counts) {
  const tiles = STAGES.map(s => `<div class="stage st-${s}"><b>${counts[s]}</b><span>${STAGE_LABEL[s]}</span></div>`).join('');
  const bar = STAGES.map(s => counts[s] ? `<i class="st-${s}" style="flex:${counts[s]}" title="${STAGE_LABEL[s]}: ${counts[s]}"></i>` : '').join('');
  return `<div class="stages">${tiles}</div><div class="pipe" role="img" aria-label="${STAGES.map(s => `${STAGE_LABEL[s]} ${counts[s]}`).join(', ')}">${bar}</div>`;
}

function momentumHTML(at) {
  const days = [...Array(14)].map((_, i) => { const d = new Date(at); d.setDate(d.getDate() - (13 - i)); return store.todayKey(d); });
  const vals = days.map(k => state.sessions[k] || 0);
  const max = Math.max(1, ...vals);
  const fmt = k => { const [, m, d] = k.split('-'); return `${Number(m)}/${Number(d)}`; };
  const bars = `<div class="spark" role="img" aria-label="Reviews per day over the last 14 days: ${vals.join(', ')}">${vals.map((v, i) =>
    `<i class="${v ? '' : 'zero'}" style="height:${Math.max(4, Math.round(v / max * 100))}%" title="${days[i]}: ${v}"></i>`).join('')}</div>
    <div class="spark-axis muted"><span>${fmt(days[0])}</span><span>today</span></div>`;
  const reviewCards = DECK.filter(c => !isNew(c.id)).map(c => cardState(c.id)).filter(c => c.state === State.Review);
  let line = '';
  if (reviewCards.length) {
    const nowAvg = buildSnapshot({}, reviewCards).avgInterval;
    const weekAgo = new Date(at); weekAgo.setDate(weekAgo.getDate() - 7);
    const key7 = store.todayKey(weekAgo);
    const twoWeeksAgo = new Date(at); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const key14 = store.todayKey(twoWeeksAgo);
    const pastKey = Object.keys(state.snapshots || {}).filter(k => k <= key7 && k >= key14).sort().pop();
    const then = pastKey ? Number(state.snapshots[pastKey]?.avgInterval) : NaN;
    line = Number.isFinite(then)
      ? `Review cards now come back every ${nowAvg} days on average, ${nowAvg > then ? 'up from' : nowAvg < then ? 'down from' : 'the same as'} ${esc(String(then))} a week ago.`
      : `Review cards now come back every ${nowAvg} days on average. Check back next week to see the gap grow.`;
  }
  return `${bars}${line ? `<p class="small" style="margin-top:10px">${line}</p>` : ''}`;
}

function renderProgress() {
  const view = $('#view');
  const at = now();
  const seen = DECK.filter(c => !isNew(c.id));
  const learned = seen.filter(c => cardState(c.id).state === State.Review);
  const due = dueCards(at).length;
  const today = state.sessions[store.todayKey()] || 0;
  const exam = nextExam(state.settings);
  const stages = stagesByFormula(DECK, cardState);
  const counts = countStages(stages);

  const topicBars = Object.keys(TOPICS).map(t => {
    const all = DECK.filter(c => c.topic === t); const l = all.filter(c => !isNew(c.id) && cardState(c.id).state === State.Review);
    return `<div class="bar h-${t}"><span>${esc(TOPICS[t])}</span><span class="track"><i style="width:${Math.round(l.length / all.length * 100)}%"></i></span><span class="muted">${l.length}/${all.length}</span></div>`;
  }).join('');

  // Per-formula predicted recall = the weakest of its cards.
  const rows = FORMULAS.map(f => {
    const cards = DECK.filter(c => c.formula.id === f.id && !isNew(c.id));
    if (!cards.length) return { f, r: null };
    const rs = cards.map(c => retrievability(scheduler, cardState(c.id), at)).filter(x => x !== null);
    return { f, r: rs.length ? Math.min(...rs) : null };
  }).sort((a, b) => (a.r ?? 2) - (b.r ?? 2));

  view.innerHTML = `<h1>Progress</h1>
    <div class="panel"><h2>Where your formulas are</h2>${pipelineHTML(counts)}
      <p class="small muted" style="margin-top:10px">A formula is <b>Learning</b> once you have met it, <b>Graduated</b> after three correct recalls, and <b>Solid</b> when it comes back a week or more apart and you can pick it out among look-alikes.</p></div>
    <div class="panel"><div class="stats">
      <div class="stat"><b>${due}</b><span>due now</span></div>
      <div class="stat"><b>${learned.length}</b><span>of ${DECK.length} cards learned</span></div>
      <div class="stat"><b>${streak()}</b><span>day streak</span></div>
      <div class="stat"><b>${today}</b><span>answered today</span></div>
      <div class="stat"><b>${seen.length - learned.length}</b><span>still learning</span></div>
      <div class="stat"><b>${DECK.length - seen.length}</b><span>not seen yet</span></div>
    </div>
    ${exam ? `<p class="small" style="margin-top:12px">${exam.name[0].toUpperCase() + exam.name.slice(1)} is ${fmtDays(exam.days)}, so no card is scheduled more than ${maxIntervalFor(state.settings)} days out. A booster session the week before is a good idea.</p>` : '<p class="small muted" style="margin-top:12px">Add your midterm and final dates in Settings and the schedule will tighten up as they get close.</p>'}
    </div>
    <div class="panel"><h2>Momentum</h2><p class="small muted">Reviews per day. The gap between reviews grows as formulas get stronger, so the same deck takes less time each week.</p>${momentumHTML(at)}</div>
    <div class="panel"><h2>Learned by topic</h2><div class="bars">${topicBars}</div></div>
    <div class="panel"><h2>Predicted recall right now</h2><p class="small muted">The scheduler's estimate of the chance you'd recall each formula if asked this minute. Weakest first. "I know this" feelings can be checked here.</p>
    <ul class="flist">${rows.map(({ f, r }) => `<li class="recall-row"><span class="name">${esc(f.name)} <span class="chip chip-stage-${stages.get(f.id)}">${STAGE_LABEL[stages.get(f.id)]}</span></span><span class="recall">${r === null ? 'not started' : `<b>${Math.round(r * 100)}%</b>`}</span></li>`).join('')}</ul></div>`;
}

/* ───────────────────────── settings ───────────────────────── */

function renderSettings() {
  const view = $('#view');
  const s = state.settings;
  view.innerHTML = `<h1>Settings</h1>
    <div class="panel">
      <div class="field"><label for="npd">New cards per day</label><span class="help">10 a day introduces the whole deck in about ${Math.ceil(DECK.length / 10)} days. Fewer if reviews start piling up.</span>
        <select id="npd">${[5, 10, 15, 20, 30].map(n => `<option value="${n}" ${s.newPerDay === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label>Grading buttons</label><span class="help">Two is enough and avoids the one mistake the scheduler can't correct: pressing "Hard" when you actually forgot.</span>
        <div class="seg" role="group"><button data-fb="0" aria-pressed="${!s.fourButtons}">Forgot / Got it</button><button data-fb="1" aria-pressed="${s.fourButtons}">Forgot / Hard / Got it / Easy</button></div></div>
      <div class="field"><label>Writing pad</label><span class="help">A space under each question to write your answer by finger, stylus or mouse. Writing keeps self-grading honest.</span>
        <div class="seg" role="group"><button data-pad="1" aria-pressed="${s.showPad}">Show</button><button data-pad="0" aria-pressed="${!s.showPad}">Hide</button></div></div>
      <div class="field"><label for="mid">Midterm date</label><input id="mid" type="date" value="${esc(s.midterm)}"></div>
      <div class="field"><label for="fin">Final exam date</label><span class="help">Review gaps are capped at about a quarter of the time left before the next exam.</span><input id="fin" type="date" value="${esc(s.final)}"></div>
    </div>
    <div class="panel"><h2>Your progress</h2><p class="small muted">Progress is saved in this browser only. Export it to move to another phone or laptop, or as a backup.</p>
      <div class="actions"><button class="btn" id="export">Export progress</button><label class="btn file-btn">Import progress<input type="file" id="import" accept="application/json,.json"></label><button class="btn danger" id="reset">Start over</button></div></div>
    <div class="panel"><h2>About</h2><p class="small">Formulas verified against OpenStax Introductory Statistics 2e, Penn State STAT 200/414, the NIST/SEMATECH e-Handbook, and Wolfram MathWorld. Scheduling by <a href="https://github.com/open-spaced-repetition/ts-fsrs" target="_blank" rel="noopener">FSRS</a>; math typeset by <a href="https://katex.org" target="_blank" rel="noopener">KaTeX</a>.</p></div>`;

  const save = () => { scheduler = makeScheduler(state.settings); persist(); toast('Saved'); };
  $('#npd').onchange = e => { s.newPerDay = Number(e.target.value); save(); };
  view.querySelectorAll('[data-fb]').forEach(b => b.onclick = () => { s.fourButtons = b.dataset.fb === '1'; save(); renderSettings(); });
  view.querySelectorAll('[data-pad]').forEach(b => b.onclick = () => { s.showPad = b.dataset.pad === '1'; save(); renderSettings(); });
  $('#mid').onchange = e => { s.midterm = e.target.value; save(); };
  $('#fin').onchange = e => { s.final = e.target.value; save(); };
  $('#export').onclick = () => {
    const blob = new Blob([store.exportState(state)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `stats-cards-progress-${store.todayKey()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#import').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { state = store.importState(await file.text()); scheduler = makeScheduler(state.settings); persist(); toast('Progress imported'); renderSettings(); }
    catch (err) { toast(err.message || 'Could not read that file'); }
  };
  $('#reset').onclick = () => {
    if (confirm('Erase all progress on this device? Export first if you want a backup.')) { state = store.resetState(); scheduler = makeScheduler(state.settings); toast('Progress cleared'); renderSettings(); }
  };
}

/* ───────────────────────── how it works ───────────────────────── */

function renderMethod() {
  const view = $('#view');
  const first = !state.settings.introSeen;
  view.innerHTML = methodHTML({ firstVisit: first, formulaCount: FORMULAS.length });
  fitMath(view);
  if (first) { state.settings.introSeen = true; store.saveState(state); }
}

/* ───────────────────────── routing ───────────────────────── */

// Coming back to Today the same day continues the session instead of rebuilding it.
// A finished session picks up any cards that have come due since the wrap-up.
function resumeOrStart(mode) {
  const sameDay = session.mode === mode && session.day === store.todayKey();
  if (!sameDay) { startSession(mode); return; }
  if (session.current || session.queue.length) { renderStudy(); return; }
  const queued = new Set();
  const fresh = dueCards().filter(c => !isNew(c.id) && !queued.has(c.id));
  if (fresh.length) {
    session.queue.push(...fresh);
    session.total += fresh.length;
    if (session.phaseOf) fresh.forEach(c => { if (!session.phaseOf.has(c.id)) session.phaseOf.set(c.id, c.kind === 'scenario' ? 'tell' : 'recall'); });
  }
  renderStudy();
}

let route = 'today';
function navigate() {
  let hash = (location.hash || '#today').slice(1);
  const views = ['today', 'drill', 'sheet', 'progress', 'method', 'settings'];
  if (!views.includes(hash)) hash = 'today'; // includes the old #study
  // First visit: explain the method before the first card.
  if (!state.settings.introSeen && hash === 'today') { hash = 'method'; try { history.replaceState(null, '', '#method'); } catch (e) { /* ignore */ } }
  route = hash;
  document.querySelectorAll('.tabs a').forEach(a => { if (a.dataset.view === route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  scheduler = makeScheduler(state.settings);
  dropPad();
  if (route === 'today') resumeOrStart('today');
  else if (route === 'drill') startSession('drill');
  else if (route === 'sheet') renderSheet();
  else if (route === 'progress') renderProgress();
  else if (route === 'method') renderMethod();
  else renderSettings();
  window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', navigate);
document.addEventListener('keydown', onKey);
navigate();
