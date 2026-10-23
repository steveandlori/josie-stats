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

  // Ink is kept as vector paths in "frame" coordinates: the size of the largest surface written on at
  // full size. Every resize redraws from the paths, scaled to fit, so shrinking for the small pad and
  // growing back for the big one never compounds: the big pad always shows the ink at 100%.
  let paths = [];                // [{ tool, pts: [[x, y], ...] }] in frame coordinates
  let frame = null;              // { w, h } or null before the first stroke
  let scale = 1;                 // CSS px per frame unit on the current surface (never above 1)
  let current = null;
  let cssW = 0, cssH = 0;        // current drawing surface size in CSS px
  let expanded = false;
  let tool = 'pen';
  const PEN_WIDTH = 2.5, ERASER_WIDTH = 22;

  const ink = () => (getComputedStyle(document.documentElement).getPropertyValue('--ink') || '#16213A').trim();
  const strokes = () => paths.filter(p => p.tool === 'pen').length;
  const fitScale = () => (frame ? Math.min(cssW / frame.w, cssH / frame.h, 1) || 1 : 1);

  function size(keep) {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.height = expanded ? '' : height + 'px';
    const w = Math.max(1, canvas.clientWidth || container.clientWidth);
    const h = Math.max(1, expanded ? canvas.clientHeight : height);
    if (keep && w === cssW && h === cssH) return;
    cssW = w; cssH = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    scale = fitScale();
    redraw();
  }

  function stylePath(t) {
    if (t === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = ERASER_WIDTH * scale; }
    else { ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = PEN_WIDTH * scale; ctx.strokeStyle = ink(); }
  }
  function drawPath(p) {
    stylePath(p.tool);
    const [x0, y0] = p.pts[0];
    ctx.beginPath(); ctx.moveTo(x0 * scale, y0 * scale);
    if (p.pts.length === 1) ctx.lineTo(x0 * scale + 0.01, y0 * scale);
    for (const [x, y] of p.pts.slice(1)) ctx.lineTo(x * scale, y * scale);
    ctx.stroke();
  }
  function redraw() {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore();
    paths.forEach(drawPath);
    ctx.globalCompositeOperation = 'source-over';
    pad.classList.toggle('has-ink', strokes() > 0);
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
  }
  function setTool(t) {
    tool = t;
    pad.querySelectorAll('[data-pad-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.padTool === t)));
    pad.classList.toggle('erasing', t === 'eraser');
  }
  function down(e) {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    // Writing at full size on a surface bigger than the frame grows the frame to that surface.
    if (scale === 1) frame = { w: Math.max(frame ? frame.w : 0, cssW), h: Math.max(frame ? frame.h : 0, cssH) };
    current = { tool, pts: [pos(e)] };
    paths.push(current);
    canvas.setPointerCapture?.(e.pointerId);
    drawPath(current);
    if (tool === 'pen') pad.classList.add('has-ink');
    e.preventDefault();
  }
  function move(e) {
    if (!current) return;
    const [lx, ly] = current.pts[current.pts.length - 1];
    const p = pos(e);
    current.pts.push(p);
    stylePath(current.tool);
    ctx.beginPath(); ctx.moveTo(lx * scale, ly * scale); ctx.lineTo(p[0] * scale, p[1] * scale); ctx.stroke();
    e.preventDefault();
  }
  function up() { current = null; ctx.globalCompositeOperation = 'source-over'; }

  function clear() { paths = []; frame = null; current = null; scale = 1; redraw(); }

  // Puts back ink saved with snapshot() (e.g. after a hint re-renders the card).
  function restore(snap) {
    if (!snap || !snap.paths) return;
    paths = snap.paths.map(p => ({ tool: p.tool, pts: p.pts.map(q => [...q]) }));
    frame = snap.frame ? { ...snap.frame } : null;
    scale = fitScale();
    redraw();
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
    hasInk: () => strokes() > 0,
    clear,
    restore,
    expand,
    collapse,
    isExpanded: () => expanded,
    setTool,
    tool: () => tool,
    snapshot: () => ({ paths: paths.map(p => ({ tool: p.tool, pts: p.pts.map(q => [...q]) })), frame: frame && { ...frame } }),
    toDataURL: () => (strokes() > 0 ? canvas.toDataURL('image/png') : null),
    destroy: () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('pad-open');
    },
  };
}
