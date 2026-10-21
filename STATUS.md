# Development status — Stats Cards

Last updated: 2026-10-20 (evening), guided learning loop built and reviewed (session with Claude; see the research doc "Josie's Stats Flash Cards — Research & Plan"
in the claude.ai `josie-stats` project for the formula verification, learning-science findings, and design rationale).

## Where things are

| Item | State |
| --- | --- |
| App (static HTML/CSS/JS) | Guided loop (Spec A) built; tested headlessly in Chromium at 390px and 1100px, light and dark; no console errors |
| Spec A, guided learning loop | Done. Spec: `docs/superpowers/specs/2026-10-20-guided-learning-loop-design.md`; plan: `docs/superpowers/plans/2026-10-20-guided-learning-loop.md`. Content review outcome: see "Content review" below |
| Unit tests | `node --test test/*.test.mjs` (38 tests on `js/guide.js` and `js/store.js`), `node test/deck.check.mjs` (deck integrity), `python3 test/linkcheck.py` (live URLs); all passing |
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

- `index.html` — shell: header tabs (Today, Which formula?, Formulas, Progress, How it works, Settings), empty `<main>`, loads KaTeX (global) and `js/app.js` (ES module).
- `js/cards.js` — the deck. `FORMULAS[]` (id, topic, name, priority M/C/S, latex[], meaning, when, symbols[], cloze with
  `\blank{...}`, optional whyQ/why, optional note = correction to Josie's notes, source). `SCENARIOS[]` (text, answer id,
  3 distractor ids). Adding a formula = adding one object; cards are generated from it.
- `js/app.js` — builds ~180 cards from the deck (recall, use, cloze, symbols, why, scenario), runs sessions (Today = guided,
  Drill = scenarios; the old plain Study tab was removed 2026-10-20 as redundant with "Study 10 more"), renders the recall loop (question-first prompt, nudge, writing pad, hint ladder, sketch
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

## Where the last session stopped (2026-10-20, late)

- Live site = the pad pen/eraser commit (QA'd: ship, 0 errors). Everything is pushed; working tree clean.
- Banked observations from the eraser QA (none blocking): strokes drawn in expanded mode shrink to fit when collapsed, so a
  reveal after collapsing shows a small sketch (product question: keep expanded ink at full size and crop instead?); erasing
  every pixel leaves the pad flagged as inked; the tool resets to pen after a hint re-render.
- Feature requests banked from Steve today: cache-busting for module scripts (10-minute stale window after deploys);
  ink colour re-tint on theme flip (cosmetic); Spec B diagrams; Spec C gamification; an import process for new course material.

## Review covenant (Steve, 2026-10-20)

Nothing user-facing ships without independent adversarial review by separate agents, using different models and different
sources: one reviewer against the sources the content cites, one on another model told to ignore those and use independent
references (Penn State STAT 200/414, MathWorld, Wikipedia, Khan). Findings are labelled VERIFIED / QUESTIONABLE / UNVERIFIED
and every confirmed finding is fixed before push. Nothing inherited from an earlier session counts as verified until re-checked.
Code gets a fresh-agent review plus a QA agent with a written test plan.

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

4. **Formula review (2026-10-20, evening).** Three independent reviewers covered all 37 formulas and 30 scenarios: two on the
   session's model against each card's cited source, one on a different model (opus) told to ignore the citations and use
   Penn State STAT 200/414, MathWorld and Wikipedia. Consensus: no formula is mathematically wrong, every cloze reproduces its
   formula, both "corrections to Josie's notes" are right. Fixed from their findings: five Penn State source URLs were dead
   (site moved to Quarto; now point at the live lesson pages); binomial, geometric and moments cited pages that did not state
   the formula (now OpenStax Appendix F and NIST 1.3.5.11); six scenarios offered a distractor that was also a correct method
   (sc-mult-ind, sc-compl, sc-relfreq, sc-expo, sc-test, sc-lln) and two "spread" scenarios now ask for the standard deviation;
   convention notes added for N(μ,σ) vs N(μ,σ²) (normalpdf, clt), p < α vs p ≤ α (decision), OpenStax AND/OR and EBM wording;
   fence "when" no longer claims whiskers end at the fences; the law-of-large-numbers line no longer reads like the gambler's
   fallacy; "disjoint"/"mutually exclusive" and "med"/"median" made consistent. Two mechanical checks now live in `test/`:
   `node test/deck.check.mjs` (KaTeX strict render of every formula, cloze and symbol; scenario integrity) and
   `python3 test/linkcheck.py` (every source and explainer URL must return 200 at its own address). Both pass.
   Open convention questions for Josie's instructor: N(μ,σ) vs N(μ,σ²); exponential with rate λ vs mean; p < α vs p ≤ α.

Deliberately not cited: Mueller & Oppenheimer 2014 (pen vs keyboard), because Morehead, Dunlosky & Rawson 2019 found the
effect much weaker on replication.

## QA (2026-10-20, evening)

Testing is done by a separate QA agent with a written plan (Steve's request), not inline. Latest run, verdict SHIP, 0 errors:
first-visit flow; full-screen writing pad at 390px and 1100px in light and dark (ink carries across expand/collapse, "I have an
answer" from the expanded pad); nine simulated days with a faked clock (all four phases appear, 18 formulas Solid by day 9,
wrap-up every day, momentum line "up from 2 a week ago", 9 snapshots, 9-day streak); export/import round trip (90 cards,
9 snapshots, 330 log entries restored); keyboard hint path; three-button grading and the 2/3/4 setting.
Non-blocking notes: GitHub Pages serves JS with `cache-control: max-age=600`, so for up to 10 minutes after a deploy a returning
browser can pair a fresh index.html with a stale module (no cache-busting on module imports); pad ink colour is fixed at draw
time, so a stroke drawn before an OS theme flip keeps its old colour until the next card.

## Grading (changed 2026-10-20 at Steve's request)

Default is three buttons, Not yet / Partly / Got it (Settings: 2, 3 or 4). Partly = FSRS Hard: a learning card keeps its
current step instead of restarting (back in ~6 min vs 1 min), a graduated card comes back sooner without counting as a lapse.
Only Got it advances a learning step, so Partly cannot shortcut the three clean recalls. Old saves with `fourButtons` migrate.

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
