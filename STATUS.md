# Development status — Stats Cards

Last updated: 2026-10-20 (session with Claude; see the research doc "Josie's Stats Flash Cards — Research & Plan"
in the claude.ai `josie-stats` project for the formula verification, learning-science findings, and design rationale).

## Where things are

| Item | State |
| --- | --- |
| App (static HTML/CSS/JS) | Built and tested headlessly in Chromium at phone width; no console errors |
| Formula deck (`js/cards.js`) | 37 formulas + 30 scenario cards, every formula verified against OpenStax / Penn State / NIST / MathWorld; all LaTeX validated with KaTeX in strict mode |
| Scheduling | FSRS via vendored `ts-fsrs` 5.4.1 (MIT); learning steps 1m/10m/10m so a new card needs 3 correct recalls to graduate; max interval capped at ~25% of days to the next exam |
| Local copy | `C:\Users\steve\claude-here\josie-stats` — files only, **not yet a git repo** (the cloud session could not run git in that folder) |
| GitHub | Repo `steveandlori/josie-stats` exists but is empty. Push from the cloud session was refused (Claude GitHub App lacks access to this repo). |
| GitHub Pages | Not enabled yet (needs the push first) |
| Live preview | Published as a claude.ai artifact ("Stats Cards") — fully working, usable today |

## To publish from a terminal (in the local folder)

```
cd C:\Users\steve\claude-here\josie-stats
git init
git add .
git commit -m "Stats Cards: spaced-repetition flash cards for intro statistics formulas"
git branch -M main
git remote add origin https://github.com/steveandlori/josie-stats.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `/ (root)` → Save.**
The site appears at https://steveandlori.github.io/josie-stats/ after a minute or two. (`.nojekyll` is already in the
repo so the `vendor/` folder is served as-is.) Note: `Statistics.pdf` sits in the same folder; add it to `.gitignore`
if it shouldn't be public.

## How the app is organized

- `index.html` — shell: header tabs, empty `<main>`, loads KaTeX (global) and `js/app.js` (ES module).
- `js/cards.js` — the deck. `FORMULAS[]` (id, topic, name, priority M/C/S, latex[], meaning, when, symbols[], cloze with
  `\blank{...}`, optional whyQ/why, optional note = correction to Josie's notes, source). `SCENARIOS[]` (text, answer id,
  3 distractor ids). Adding a formula = adding one object; cards are generated from it.
- `js/app.js` — builds ~180 cards from the deck (recall, use, cloze, symbols, why, scenario), runs sessions, renders the
  five views (study, drill, sheet, progress, settings), hash routing, keyboard shortcuts (space / 1 / 2).
- `js/scheduler.js` — thin wrapper around ts-fsrs; exam-aware `maximum_interval`.
- `js/store.js` — localStorage persistence (`josie-stats-v1`), export/import JSON, reset.
- `css/style.css` — tokens in `:root`, dark mode via `prefers-color-scheme` and `[data-theme="dark"]`.
- `vendor/` — KaTeX 0.16.22 (css, js, woff2 fonts) and ts-fsrs 5.4.1 ESM build.

Session logic worth knowing: a day's stack = all due cards + up to `newPerDay` unseen cards (priority M → C → S,
recall cards before other kinds, formulas shuffled with a fixed seed), shuffled together. Cards still in
Learning/Relearning after a grade are re-inserted 3–5 positions later in the same session. Scenario cards grade
themselves (right pick = Got it, wrong = Forgot).

## Known corrections to Josie's notes (both flagged in the app)

- Population SD: `σ = √( Σ(x−μ)² / N )` — the notes have the N outside the root.
- Standard error: `σ / √n` — the notes say "divided by number of samples".

## Ideas not yet done

- Service worker for offline use (vendor assets are local already, only the Google Font is remote).
- Typed-answer mode for cloze cards instead of self-grading.
- More decks as the course progresses: two-sample tests, chi-square tests, correlation/regression.
- Match the instructor's notation (Poisson λ vs μ; N(μ, σ) vs N(μ, σ²)) once known.
- Per-user FSRS parameter optimization is unnecessary at this deck size; defaults are fine.
