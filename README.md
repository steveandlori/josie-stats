# Stats Cards

Spaced-repetition flash cards for an introductory statistics course: 37 formulas, each verified against
OpenStax *Introductory Statistics 2e*, Penn State STAT 200/414, the NIST/SEMATECH e-Handbook, or Wolfram
MathWorld, with the source linked on every card.

Live site: https://steveandlori.github.io/josie-stats/

## How it works

- **Study** — one shuffled stack per day, mixed across topics. You must tap *Show answer* before you can
  grade, then choose *Forgot* or *Got it*. A new card stays in the session until it has been recalled
  correctly three times; afterwards it comes back on a schedule set by [FSRS](https://github.com/open-spaced-repetition/ts-fsrs).
- **Which formula?** — scenario cards: read a problem, pick the right formula from four look-alikes.
  This is the skill exams actually test, and mixed practice is what builds it.
- **Formulas** — the full sheet with meaning, when-to-use, and sources. Two corrections to the original
  class notes are flagged.
- **Progress** — cards due, cards learned, streak, and each formula's predicted recall right now.
- **Settings** — new cards per day, two- or four-button grading, exam dates (review gaps are capped at
  about a quarter of the days until the next exam), export/import of progress.

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
