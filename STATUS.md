# Development status — Stats Cards

Last updated: 2026-10-20 (evening), guided learning loop built and reviewed (session with Claude; see the research doc "Josie's Stats Flash Cards — Research & Plan"
in the claude.ai `josie-stats` project for the formula verification, learning-science findings, and design rationale).

## Where things are

| Item | State |
| --- | --- |
| App (static HTML/CSS/JS) | Guided loop (Spec A) built; tested headlessly in Chromium at 390px and 1100px, light and dark; no console errors |
| Spec A, guided learning loop | Done. Spec: `docs/superpowers/specs/2026-10-20-guided-learning-loop-design.md`; plan: `docs/superpowers/plans/2026-10-20-guided-learning-loop.md`. Content review outcome: see "Content review" below |
| Unit tests | `node --test test/*.test.mjs` — 33 tests on `js/guide.js` and `js/store.js`, all passing |
| Formula deck (`js/cards.js`) | 37 formulas + 30 scenario cards, every formula verified against OpenStax / Penn State / NIST / MathWorld; all LaTeX validated with KaTeX in strict mode |
| Scheduling | FSRS via vendored `ts-fsrs` 5.4.1 (MIT); learning steps 1m/10m/10m so a new card needs 3 correct recalls to graduate; max interval capped at ~25% of days to the next exam |
| Local copy | `C:\Users\steve\claude-here\josie-stats` — git repo, `main` tracks `origin/main` |
| GitHub | https://github.com/steveandlori/josie-stats — initial commit pushed 2026-10-20 (35 files; `Statistics.pdf` is gitignored and not public) |
| GitHub Pages | Enabled 2026-10-20 (branch `main`, root). Live at https://steveandlori.github.io/josie-stats/ |
| Live preview | Published as a claude.ai artifact ("Stats Cards") — fully working, usable today |

## Publishing changes

The site deploys automatically from `main`. From the local folder:

```
git add .
git commit -m "describe the change"
git push
```

GitHub Pages rebuilds within a minute or two. `.nojekyll` keeps the `vendor/` folder served as-is.
`Statistics.pdf` (the class notes) is in `.gitignore` and must stay out of the public repo.

## How the app is organized

- `index.html` — shell: header tabs (Today, Study, Which formula?, Formulas, Progress, How it works, Settings), empty `<main>`, loads KaTeX (global) and `js/app.js` (ES module).
- `js/cards.js` — the deck. `FORMULAS[]` (id, topic, name, priority M/C/S, latex[], meaning, when, symbols[], cloze with
  `\blank{...}`, optional whyQ/why, optional note = correction to Josie's notes, source). `SCENARIOS[]` (text, answer id,
  3 distractor ids). Adding a formula = adding one object; cards are generated from it.
- `js/app.js` — builds ~180 cards from the deck (recall, use, cloze, symbols, why, scenario), runs sessions (Today = guided,
  Study = plain, Drill = scenarios), renders the recall loop (question-first prompt, nudge, writing pad, hint ladder, sketch
  beside answer, automatic grade after hints), the wrap-up, and the views (sheet, progress, method, settings); hash routing;
  first-visit redirect to How it works; keyboard shortcuts (space / h / 1 / 2).
- `js/guide.js` — pure, DOM-free: formula stages (New → Learning → Graduated → Solid, derived from FSRS states), the Today
  composer (recall / meet / deepen / tell-apart phases with a half-budget rule), hint ladder per card kind, nudges, automatic
  rating (1 hint = Hard, 2+ = Again), snapshots. Unit-tested in `test/`.
- `js/pad.js` — scratchpad canvas (Pointer Events, DPR-aware, restore after re-render).
- `js/method.js` — How it works content, 23 references (all DOIs resolved 2026-10-20), illustrative forgetting-curve SVG.
- `js/scheduler.js` — thin wrapper around ts-fsrs; exam-aware `maximum_interval`.
- `js/store.js` — localStorage persistence (`josie-stats-v1`), export/import JSON, reset. Settings gained `introSeen`, `showPad`;
  state gained `snapshots` (daily stage counts + average review gap, for the Progress momentum line); log entries carry `hints`.
- `css/style.css` — tokens in `:root`, dark mode via `prefers-color-scheme` and `[data-theme="dark"]`.
- `vendor/` — KaTeX 0.16.22 (css, js, woff2 fonts) and ts-fsrs 5.4.1 ESM build.

Session logic worth knowing: a day's stack = all due cards + up to `newPerDay` unseen cards (priority M → C → S,
recall cards before other kinds, formulas shuffled with a fixed seed), shuffled together. Cards still in
Learning/Relearning after a grade are re-inserted 3–5 positions later in the same session. Scenario cards grade
themselves (right pick = Got it, wrong = Forgot).

## Known corrections to Josie's notes (both flagged in the app)

- Population SD: `σ = √( Σ(x−μ)² / N )` — the notes have the N outside the root.
- Standard error: `σ / √n` — the notes say "divided by number of samples".

## Content review (2026-10-20)

Three checks were run on the research content before publishing, because a wrong claim misleads the student.

1. **DOI resolution.** All 24 references in `js/method.js` resolved against doi.org with content negotiation; the APA strings
   returned were used for the bibliography. No bibliographic errors.
2. **Adversarial claim review** by a separate agent, checking each cited sentence against the paper's abstract (Europe PMC,
   Crossref, Semantic Scholar, and full text for Rohrer & Taylor 2007, Pan & Sana 2021, Cepeda 2006, Dunlosky & Rawson 2012).
   Verdict: publish after fixes. Fixed: Pan & Sana 2021 (was "both beat rereading"; the paper compared against no test, and
   pretesting did at least as well as posttesting); Little & Bjork 2016 was applied to the Which formula? cards, which are
   post-study items, so Little, Bjork, Bjork & Angello 2012 was added as ref 24 for that claim; Dunlosky & Rawson 2012 (the
   paper rules out "stopped practising too early" as the mechanism; now worded as accuracy predicting retention after allowing
   for practice); MacLeod 2010 production effect (holds in mixed lists only; worded accordingly in the page and the nudge);
   Kapur 2014 (benefit is conceptual understanding and transfer, procedures equal); FSRS attribution (the KDD 2022 paper is the
   memory model fitted to 220 million logs, not FSRS's own parameters); "makes the answer stick" softened to "helps";
   "There is nothing to type" became "Nothing has to be typed" because the writing pad exists; wrap-up "Spacing is what
   makes this stick" became "a big part of".
3. **Fresh code review** of the whole diff by a separate agent: 2 bugs (orphaned cloze card on an odd new-card budget; first-visit
   redirect stuck when the URL already ended in `#today`) and 9 minors, all fixed and the bugs covered by unit tests.

Deliberately not cited: Mueller & Oppenheimer 2014 (pen vs keyboard), because Morehead, Dunlosky & Rawson 2019 found the
effect much weaker on replication.

## Banked specs

- **Spec B, inline diagrams** for formulas whose picture is the concept (z-score area, SE narrowing with n, variance as
  squares, binomial bars). Independent of Spec A.
- **Spec C, gamification.** Reward showing up and honest grading (streaks, sessions, formulas moved), never speed or "Easy"
  grades (Dunlosky & Rawson 2012 on overconfidence).

## Ideas not yet done

- Service worker for offline use (vendor assets are local already, only the Google Font is remote).
- Typed-answer mode for cloze cards instead of self-grading.
- More decks as the course progresses: two-sample tests, chi-square tests, correlation/regression.
- Match the instructor's notation (Poisson λ vs μ; N(μ, σ) vs N(μ, σ²)) once known.
- Per-user FSRS parameter optimization is unnecessary at this deck size; defaults are fine.
