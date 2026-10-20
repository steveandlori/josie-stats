// Scratchpad: a small drawing surface under a prompt so the learner can write the answer
// before revealing it. Writing is a commitment, which keeps self-grading honest.
// Pointer Events cover finger, stylus and mouse. No dependencies.

export function createPad(container, { height = 150 } = {}) {
  container.innerHTML = `<div class="pad"><canvas aria-label="Scratchpad: write your answer here"></canvas>
    <div class="pad-bar"><span class="muted">Write your answer here</span><button class="btn btn-small" type="button" data-pad-clear>Clear</button></div></div>`;
  const canvas = container.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  let strokes = 0;
  let drawing = false;
  let last = null;

  const ink = () => (getComputedStyle(document.documentElement).getPropertyValue('--ink') || '#16213A').trim();

  function size(keep) {
    const snapshot = keep && strokes ? canvas.toDataURL() : null;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, container.clientWidth);
    canvas.style.height = height + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = ink();
    if (snapshot) restore(snapshot);
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
  function up() { drawing = false; last = null; }

  function clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); strokes = 0; }
  function restore(dataURL) {
    if (!dataURL) return;
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width / (window.devicePixelRatio || 1), height); strokes = Math.max(strokes, 1); };
    img.src = dataURL;
  }

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', up);
  container.querySelector('[data-pad-clear]').addEventListener('click', clear);
  const onResize = () => size(true);
  window.addEventListener('resize', onResize);
  size(false);

  return {
    hasInk: () => strokes > 0,
    clear,
    restore,
    toDataURL: () => (strokes > 0 ? canvas.toDataURL('image/png') : null),
    destroy: () => { window.removeEventListener('resize', onResize); },
  };
}
