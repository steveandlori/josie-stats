# Notes for josie-stats from Hebrew by Book (2026-10-23)

Two things learned while building Hebrew by Book (which started from josie-stats' engine) that apply back. The
first is a bug josie-stats has today; the second is an optional feature, with the mistake made in its first version.

## 1. Writing pad: ink shrinks every time the learner leaves and re-enters full screen (bug)

**Steve's report:** "When I go full screen on write and then return to the main page, what I wrote is resized
smaller, which is fine, but when I go full screen again, it is still small, and then going back again from there to
the main page makes it even smaller! … it should be restored to normal (100%) whenever going back to the full screen pad."

**Cause.** `js/pad.js` keeps the ink only as pixels. On every resize, `size(true)` snapshots the canvas to a data URL
and `restore()` draws it back scaled by `min(cssW / sw, cssH / sh, 1)`. Leaving full screen scales it down; entering
full screen again cannot scale it up (the `1` cap), and the small copy is now the only copy. Each round trip compounds.
josie-stats' `js/pad.js` at `c66c77c` is byte-for-byte the version that has this bug.

**Fix (Hebrew by Book commit 6adec86).** Keep the ink as vector paths instead of pixels and redraw from them on every
resize:
- `paths = [{ tool: 'pen' | 'eraser', pts: [[x, y], ...] }]` in "frame" coordinates; `frame = { w, h }` is the
  largest surface written on at full size; `scale = min(cssW / frame.w, cssH / frame.h, 1)`.
- `pointerdown` grows the frame to the current surface when `scale === 1`, then records points as screen ÷ scale.
- `size()` resets the canvas and calls `redraw()`, which replays every path at the current scale (pen and eraser
  widths scaled too; the eraser stays `destination-out`).
- New `snapshot()` returns `{ paths, frame }`; `restore(snap)` takes that object instead of a data URL.
  `toDataURL()` is unchanged, still used for the "Your answer" image at reveal.

The new file can replace josie-stats' `js/pad.js` as is:
`C:\Users\steve\claude-here\hebrew-by-book\js\pad.js`. `js/app.js` needs three small changes:
- `captureSketch` stores `{ url: pad.toDataURL(), ink: pad.snapshot() }` instead of the bare data URL.
- The re-render after a hint calls `session.pad.restore(session.sketch.ink)`.
- The reveal's `<img>` uses `session.sketch.url`.

**Verified** in Playwright: three full-screen round trips plus a hint re-render each time. The full-screen ink
measured 262×342 px every time; before the fix it shrank on each round.

## 2. Milestone stars in Meet (feature; optional)

**Steve's request:** the Meet stretch is long and needs feedback, "a star should appear (floating) briefly in the
middle of the screen after so many correct answers … and maybe the stars could be banked until the entire meet round
is finished, achieving 5 stars." After the fix below: "we want them to feel more like exercise milestones than
stacked achievements."

**What Hebrew by Book does:**
- Five hollow stars on the Meet chip of the phase strip. A gold one (with a darker gold outline) floats up mid-screen
  at each fifth of the Meet work, with "Meet: 2 of 5 ★", and "Meet complete ★★★★★" at the end.
- The stars are banked and repeated on the wrap-up.
- On Which word? cards, which the app grades rather than the learner, every 3 right in a row shows a small spark.
- The animation respects `prefers-reduced-motion` (fade only).

**The mistake in version 1 (commit 3c99fcf), fixed in 0d0deef.** Version 1 counted Meet cards *cleared*, meaning
cards no longer in the queue. With learning steps `1m, 10m, 10m`, every new card needs three clean recalls before it
clears, and the cards clear together near the end of Meet. In a test run (all Got it) no star appeared on the first
14 cards, then one star came on each of the next five cards: nothing for a long time, then five in a row.

Version 2 counts clean recalls toward the three each card needs:

```js
export const CLEAN_RECALLS = 3; // the scheduler's learning steps
export function meetStep(prev, rating, graduated) {   // per Meet card, after each grade
  if (graduated) return CLEAN_RECALLS;                  // left its learning steps
  if (rating <= 1) return 0;                            // Not yet: back to the start, as FSRS does
  return rating >= 3 ? Math.min(prev + 1, CLEAN_RECALLS - 1) : prev;   // Partly holds
}
export function meetStars(steps, totalCards) {
  let done = 0; for (const s of steps) done += s;
  return totalCards ? Math.min(5, Math.floor(5 * done / (CLEAN_RECALLS * totalCards))) : 0;
}
```

The app keeps `session.meetSteps` (a Map from card id to step, for cards whose phase is `meet`). It shows
`max(stars already earned, meetStars(...))`, so a star once earned stays.

**Verified:** a fresh 10-word Meet round (60 views, all Got it) put the stars at views 12, 24, 36, 48 and 60.

Code: `js/guide.js` (`CLEAN_RECALLS`, `meetStep`, `meetStars`); `js/app.js` (`onGrade`, `meetStarsNow`,
`starsHTML`, `celebrate`); the `.stars` and `.burst` rules in `css/style.css`, plus `--gold` and `--gold-edge` in
each theme block. Tests: `test/guide.hints.test.mjs`.

## 3. Two testing gotchas met along the way

- **Stale modules in Playwright.** After editing JS, a reloaded page kept running the old ES modules: Python's
  `http.server` answered 304, and even CDP `Network.setCacheDisabled` did not help. A fresh port (a new origin) did.
  Note that `scripts/serve.py` here also turns caching off for the user's own browser.
- **Chained shell commands.** `node test/board.check.mjs && … ; git commit` still committed after the check failed,
  because of the `;`. Chain every step with `&&`.
