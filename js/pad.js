// Scratchpad: a drawing surface under a prompt so the learner can write the answer before revealing
// it. Writing is a commitment, which keeps self-grading honest. "Write bigger" expands the pad to a
// nearly full-screen surface for fingers and styluses. Pointer Events cover finger, stylus and mouse.

export function createPad(container, { height = 150, title = '', onAnswer = null } = {}) {
  container.innerHTML = `<div class="pad">
    <div class="pad-top"><span class="pad-title"></span><button class="btn btn-small" type="button" data-pad-collapse>Done</button></div>
    <span class="pad-placeholder" aria-hidden="true">Write your answer here</span>
    <canvas aria-label="Scratchpad: write your answer here"></canvas>
    <div class="pad-bar"><span class="pad-tools" role="group" aria-label="Pad tool"><button class="btn btn-small btn-icon" type="button" data-pad-tool="pen" aria-pressed="true" aria-label="Pen" title="Pen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button><button class="btn btn-small btn-icon" type="button" data-pad-tool="eraser" aria-pressed="false" aria-label="Eraser" title="Eraser"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20H8.5L3.6 15.1a2 2 0 0 1 0-2.8l8.7-8.7a2 2 0 0 1 2.8 0l5.6 5.6a2 2 0 0 1 0 2.8L13.5 19.2"/><path d="M7.2 10.6l6.2 6.2"/></svg></button></span>
      <span class="pad-actions"><button class="btn btn-small" type="button" data-pad-clear>Clear</button><button class="btn btn-small btn-icon" type="button" data-pad-expand aria-label="Write bigger" title="Write bigger"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M16 21h5v-5"/></svg></button><button class="btn btn-small btn-primary" type="button" data-pad-answer>I have an answer</button></span></div></div>`;
  const pad = container.querySelector('.pad');
  const canvas = container.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  pad.querySelector('.pad-title').textContent = title;
  if (!onAnswer) pad.querySelector('[data-pad-answer]').remove();

  let strokes = 0;
  let drawing = false;
  let last = null;
  let cssW = 0, cssH = 0;        // current drawing surface size in CSS px
  let lastGood = null;           // { url, w, h } taken before a resize, so a second resize cannot snapshot a cleared canvas
  let expanded = false;
  let tool = 'pen';
  const ERASER_WIDTH = 22;

  const ink = () => (getComputedStyle(document.documentElement).getPropertyValue('--ink') || '#16213A').trim();

  function size(keep) {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.height = expanded ? '' : height + 'px';
    const w = Math.max(1, canvas.clientWidth || container.clientWidth);
    const h = Math.max(1, expanded ? canvas.clientHeight : height);
    if (keep && w === cssW && h === cssH) return;
    const snapshot = keep && strokes ? (lastGood || { url: canvas.toDataURL(), w: cssW, h: cssH }) : null;
    if (snapshot) lastGood = snapshot;
    cssW = w; cssH = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = ink();
    if (snapshot) restore(snapshot, () => { lastGood = null; });
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function applyTool() {
    if (tool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = ERASER_WIDTH; }
    else { ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = 2.5; ctx.strokeStyle = ink(); }
  }
  function setTool(t) {
    tool = t;
    pad.querySelectorAll('[data-pad-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.padTool === t)));
    pad.classList.toggle('erasing', t === 'eraser');
  }
  function down(e) {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    drawing = true; last = pos(e);
    canvas.setPointerCapture?.(e.pointerId);
    applyTool();
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(last.x + 0.01, last.y); ctx.stroke();
    if (tool === 'pen') { strokes++; pad.classList.add('has-ink'); }
    e.preventDefault();
  }
  function move(e) {
    if (!drawing) return;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p;
    e.preventDefault();
  }
  function up() { drawing = false; last = null; lastGood = null; }

  function clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); strokes = 0; lastGood = null; pad.classList.remove('has-ink'); }

  // Draws a saved image scaled to fit the current surface (width-first, never cropped).
  function restore(snap, done) {
    const s = typeof snap === 'string' ? { url: snap, w: cssW, h: cssH } : snap;
    if (!s || !s.url) return;
    const img = new Image();
    img.onload = () => {
      const sw = s.w || img.width, sh = s.h || img.height;
      const k = Math.min(cssW / sw, cssH / sh, 1) || 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, 0, 0, sw * k, sh * k);
      strokes = Math.max(strokes, 1);
      pad.classList.add('has-ink');
      if (done) done();
    };
    img.src = s.url;
  }

  function expand() {
    if (expanded) return;
    expanded = true;
    pad.classList.add('expanded');
    document.body.classList.add('pad-open');
    size(true);
    pad.querySelector('[data-pad-collapse]').focus();
  }
  function collapse() {
    if (!expanded) return;
    expanded = false;
    pad.classList.remove('expanded');
    document.body.classList.remove('pad-open');
    size(true);
    pad.querySelector('[data-pad-expand]').focus();
  }
  function onKey(e) { if (expanded && e.key === 'Escape') { e.preventDefault(); collapse(); } }

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', up);
  pad.querySelector('[data-pad-clear]').addEventListener('click', clear);
  pad.querySelectorAll('[data-pad-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.padTool)));
  pad.querySelector('[data-pad-expand]').addEventListener('click', expand);
  pad.querySelector('[data-pad-collapse]').addEventListener('click', collapse);
  if (onAnswer) pad.querySelector('[data-pad-answer]').addEventListener('click', () => onAnswer());
  document.addEventListener('keydown', onKey);
  const onResize = () => size(true);
  window.addEventListener('resize', onResize);
  size(false);

  return {
    hasInk: () => strokes > 0,
    clear,
    restore,
    expand,
    collapse,
    isExpanded: () => expanded,
    setTool,
    tool: () => tool,
    toDataURL: () => (strokes > 0 ? canvas.toDataURL('image/png') : null),
    destroy: () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('pad-open');
    },
  };
}
