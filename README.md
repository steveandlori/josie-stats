# Stats Cards

Spaced-repetition flash cards for an introductory statistics course: 37 formulas, each verified against
OpenStax *Introductory Statistics 2e*, Penn State STAT 200/414, the NIST/SEMATECH e-Handbook, or Wolfram
MathWorld, with the source linked on every card.

Live site: https://steveandlori.github.io/josie-stats/

## How it works

The app is self-graded: think of the answer, reveal it, say honestly whether you had it. The first visit
opens **How it works**, which explains the method and cites the research behind each part (23 references,
every DOI resolved).

- **Today** (the default) — a guided session built from four kinds of work: *Recall* what is due, *Meet*
  new formulas (as a guess-first question, then the fill-in-the-blank version), *Deepen* graduated formulas
  (meaning, symbols, why), and *Tell apart* look-alikes with scenario cards. A wrap-up shows which formulas
  moved stage today.
- **The recall loop** — every question has a writing pad (finger, stylus or mouse; the expand icon expands it to
  nearly the whole screen, with the question in the top bar and Done, Clear and I have an answer at hand) and two buttons:
  *I have an answer* and *Give me a hint*. Hints climb a ladder (what it computes, which symbols, the shape
  with a blank). At reveal your sketch sits beside the formula. With no hints you grade yourself, *Not yet*,
  *Partly* or *Got it*; with one hint the card grades itself Partly, with two or more it counts as not recalled.
  A new card stays in the session until it has been recalled correctly three times; afterwards it comes
  back on a schedule set by [FSRS](https://github.com/open-spaced-repetition/ts-fsrs).
- **Which formula?** — scenario cards only: read a problem, pick the right formula from four look-alikes.
- **Formulas** — the full sheet with meaning, when-to-use, sources and a *See it explained* link to a free
  visual explainer (Seeing Theory, StatQuest, OpenStax). Two corrections to the original class notes are flagged.
- **Progress** — where each formula sits (New, Learning, Graduated, Solid), reviews per day, how the average
  gap between reviews is growing, and each formula's predicted recall right now.
- **Settings** — new cards per day, two, three or four grading buttons, the writing pad, exam dates (review gaps
  are capped at about a quarter of the days until the next exam), export/import of progress.

## Tests

Session logic lives in `js/guide.js` with no DOM dependencies. Run `node --test test/*.test.mjs` (Node 20+).
`node test/deck.check.mjs` renders every formula, cloze and symbol with KaTeX in strict mode and checks the scenario cards;
`python3 test/linkcheck.py` confirms every source and explainer URL is live.

Progress is stored in the browser (localStorage). Use *Export progress* to move it to another device.

## Running it

It is a static site: open `index.html` in a browser, or serve the folder with any web server
(`python3 -m http.server`). No build step, no accounts, no server.

## Publishing on GitHub Pages

1. Create a repository named `josie-stats` on GitHub.
2. Push this folder to its `main` branch.
3. In the repository's *Settings → Pages*, set *Source* to "Deploy from a branch", branch `main`, folder `/ (root)`.

## Editing the deck

All formulas and scenarios live in `js/cards.js`. Each formula has a display formula (LaTeX), a meaning,
a when-to-use line, symbol definitions, a fill-in-the-blank version (`\blank{...}` marks the blank),
an optional "why" explanation, and a source. Add an object to `FORMULAS` or `SCENARIOS` and reload.

## Credits

- Scheduling: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT), vendored in `vendor/`.
- Math typesetting: [KaTeX](https://katex.org) (MIT), vendored in `vendor/katex/`.
- Typeface: Atkinson Hyperlegible (Braille Institute), via Google Fonts.
