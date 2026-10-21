// Scratchpad: a drawing surface under a prompt so the learner can write the answer before revealing
// it. Writing is a commitment, which keeps self-grading honest. "Write bigger" expands the pad to a
// nearly full-screen surface for fingers and styluses. Pointer Events cover finger, stylus and mouse.

export function createPad(container, { height = 150, title = '', onAnswer = null } = {}) {
  container.innerHTML = `<div class="pad">
    <div class="pad-top"><span class="pad-title"></span><button class="btn btn-small" type="button" data-pad-collapse>Done</button></div>
    <canvas aria-label="Scratchpad: write your answer here"></canvas>
    <div class="pad-bar"><span class="muted pad-hint">Write your answer here</span>
      <span class="pad-actions"><button class="btn btn-small" type="button" data-pad-clear>Clear</button><button class="btn btn-small" type="button" data-pad-expand>Write bigger</button><button class="btn btn-small btn-primary" type="button" data-pad-answer>I have an answer</button></span></div></div>`;
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
  function down(e) {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    drawing = true; last = pos(e);
    canvas.setPointerCapture?.(e.pointerId);
    ctx.strokeStyle = ink();
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(last.x + 0.01, last.y); ctx.stroke();
    strokes++;
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

  function clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); strokes = 0; lastGood = null; }

  // Draws a saved image scaled to fit the current surface (width-first, never cropped).
  function restore(snap, done) {
    const s = typeof snap === 'string' ? { url: snap, w: cssW, h: cssH } : snap;
    if (!s || !s.url) return;
    const img = new Image();
    img.onload = () => {
      const sw = s.w || img.width, sh = s.h || img.height;
      const k = Math.min(cssW / sw, cssH / sh, 1) || 1;
      ctx.drawImage(img, 0, 0, sw * k, sh * k);
      strokes = Math.max(strokes, 1);
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
    toDataURL: () => (strokes > 0 ? canvas.toDataURL('image/png') : null),
    destroy: () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('pad-open');
    },
  };
}
