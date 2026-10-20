# Spec A — Guided learning loop

Date: 2026-10-20. Status: approved in conversation by Steve ("build according to your recommendations, then I'll try it out"). Every decision below is a default he can veto after trying it.

## Why

Steve opened the live site, met the card "Write the formula for Mean", and tried mouse, touch screen and keyboard before giving up: there was no place to write and nothing said what to do. That scene is the canonical scenario for this spec. The app already runs spaced retrieval practice, but it leaves the learner to pick modes and to grade themselves with no help, and it never explains why any of it works.

Spec A turns the research into a guided default. The learner opens the app, sees today's session, and is walked through a loop that the learning-science literature supports: guess first, get a hint only if stuck, see the answer and read it aloud, grade honestly, then meet related formulas side by side. The other modes stay available, but the default steers toward the loop.

Out of scope, with their own specs later: inline diagrams per formula (Spec B), gamification (Spec C).

## Canonical scenarios

1. **Steve's first card.** A first-time visitor must never see a bare recall card. They see "How it works" first, then a session whose first card tells them exactly what to do and gives them a place to write.
2. **Josie meets "Standard error" for the first time.** She has never seen it. The card says so, asks for a guess anyway and says why. She guesses wrong. The answer appears next to her sketch, with the meaning and the why, and asks her to read it aloud once. The card comes back within minutes until she has had it right three times.
3. **Josie knows "Sample variance" but reaches for "Population variance".** Both are graduated. A scenario card asks which formula fits "you surveyed 12 classmates". She picks the wrong one and sees both formulas labelled, with why this one.
4. **Josie is stuck on "Binomial distribution".** She taps "Give me a hint" twice. The card grades itself as Forgot and says so kindly. She never has to decide whether a hinted answer "counts".
5. **Josie wants to see that it is working.** Progress shows formulas flowing from New through Learning and Graduated to Solid, and that the average gap between reviews has grown since last week.

## Formula stages

Stages are derived from the FSRS card states already stored. Nothing new is persisted for them.

| Stage | Rule |
| --- | --- |
| New | The formula's recall card has never been seen. |
| Learning | Recall card seen, not yet in FSRS Review state (still in learning or relearning steps). |
| Graduated | Recall card in Review, but not yet Solid. |
| Solid | Recall and cloze cards in Review, the formula's scenario card (if it has one) in Review, and recall stability of at least 7 days. |

The Progress view shows the four stages as a pipeline. Session wrap-up shows which formulas moved today.

## Guided session ("Today")

Route `#today`, the default. The composer builds one queue from four kinds of work, in this order, each block shuffled internally so topics stay mixed:

1. **Recall.** Every due card except scenario cards.
2. **Meet.** New formulas, introduced as a unit: the recall card (a pretest, see below) and the cloze card. Formula order is the existing deterministic one (midterm material first).
3. **Deepen and tell apart.** New use, symbols and why cards for formulas already Graduated, and new scenario cards whose answer formula is Graduated, plus all due scenario cards.
4. **Wrap-up.** A summary screen, see below.

The new-card budget is the existing `newPerDay` setting, counted in cards as today. Allocation: deepen and tell-apart cards take up to half the budget first, then meet pairs fill the rest, then any remaining budget goes back to deepen and tell apart. This keeps new formulas arriving while graduated ones start being discriminated.

Cards still in learning after a grade are re-inserted three to five positions later, as today. Each card carries a phase tag (Recall, Meet, Deepen, Tell apart) shown as a pill in the card header. The session header shows the phase strip with counts remaining.

**Wrap-up.** Cards answered, formulas met today, formulas that graduated today, formulas that became solid today, the stage pipeline, when the next cards come due, and one true encouraging line (for example "Tomorrow's review will be shorter than you expect. That is spacing doing its work."). Buttons: Study 10 more, See progress. Writing the wrap-up also writes today's snapshot (see Storage).

## The recall loop

Applies to recall, cloze, use, symbols and why cards, in Today and in Study. Scenario cards keep their multiple-choice form, because choosing between look-alikes is the discrimination task.

**Front.**
- Prompt phrased as a question, never "Write": "What's the formula for **Mean (average)**?"
- When the card is new: "You haven't met this one yet. Guess anyway, even a rough one. A guess, even a wrong one, makes the answer stick."
- A modality nudge, rotating per card: "Say it out loud this time." / "Write it down, on paper or in the pad below." / "Picture it in your head this time." Each has a one-line reason in the How it works screen, not on the card.
- A scratchpad: a drawing area below the prompt, open by default, about 150px tall, for finger, stylus or mouse, with Clear. A "Hide pad" link turns it off and the choice is remembered. If the learner drew anything, the sketch is shown beside the answer at reveal under "Your answer", with the formula under "The formula".
- Two buttons: **I have an answer** (primary) and **Give me a hint**.

**Hint ladder.** Each tap shows the next hint, keeping earlier ones visible. After the last hint the button reads **Show me**.

| Kind | Hint 1 | Hint 2 | Hint 3 |
| --- | --- | --- | --- |
| recall (name to formula) | what it computes (meaning) | the symbols it uses, names only | the formula with a blank (cloze front) |
| cloze | meaning | symbols with their meanings | — |
| use (formula to meaning) | the formula's name | when to use it | — |
| symbols | the formula's name | meaning | — |
| why | meaning | when to use it | — |

**Reveal.** The answer as today (formula, meaning, when, why if any, note, source, plus "See it explained" links where curated), preceded by a small cue "Read it aloud once." If the learner used hints, a short honest line: one hint, "You got there with a nudge. It will come back soon."; two or more, "Not yet, and that is fine. Seeing the answer right after a real try is how it sticks."

**Grading.**
- No hints: the learner grades. Two buttons by default, labelled **Not yet** and **Got it**. Four-button mode keeps Hard and Easy.
- One hint: graded automatically as Hard. One button, **Next**.
- Two or more hints, or Show me: graded automatically as Forgot (Again). One button, **Next**.
- Scenario cards: unchanged, a right pick is Got it, a wrong pick is Forgot.

Keyboard: space or Enter reveals, `h` asks for a hint, after reveal 1 and 2 (or 1 to 4) grade as today, space or Enter advances when the grade was automatic.

## How it works (route `#method`)

Shown automatically on the first visit, and always available from its tab. Sections, in order:

1. **One line.** Stats Cards is self-graded. Think of the answer, reveal it, say honestly whether you had it. There is nothing to type.
2. **A card, step by step.** Four steps with a small mock card beside each: Guess (even a rough one), Hint only if stuck, Reveal and read it aloud, Grade honestly.
3. **Why it works.** Short sections, each with a claim, what the app does about it, and numbered references:
   - Guess before you look (pretesting and errorful generation).
   - Retrieval beats rereading (the testing effect).
   - Hints, not answers (scaffolded feedback, impoverished cues).
   - Spacing beats cramming (forgetting curve, FSRS, three recalls to graduate). Includes an inline chart: recall probability decaying over days, each review resetting it higher and the decay slowing.
   - Mixing beats blocking (interleaving in mathematics; the Tell apart phase).
   - Think, write, say (covert retrieval is as good as overt; writing keeps grading honest; the production effect).
   - Honest grading (overconfidence undermines retention; why two buttons; why hints grade automatically).
4. **How a formula moves.** The four stages in a row and what it takes to advance.
5. **References.** Numbered, journal style, every entry with a DOI link. All DOIs were resolved against doi.org on 2026-10-20.
6. **Start today's session**, a primary button to `#today`.

Register: declarative, specific, no exclamation marks. Visual style: the app's existing tokens, cards and type, working in light and dark.

References to include (all verified):
Roediger & Karpicke 2006; Karpicke & Roediger 2008; Dunlosky et al. 2013; Cepeda et al. 2006; Cepeda et al. 2008; Rawson & Dunlosky 2011; Ye, Su & Cao 2022; Rohrer & Taylor 2007; Rohrer, Dedrick & Stershic 2015; Kornell, Hays & Bjork 2009; Richland, Kornell & Kao 2009; Potts & Shanks 2014; Kapur 2014; Metcalfe 2017; Pan & Sana 2021; Grimaldi & Karpicke 2012; Little & Bjork 2016; Finn & Metcalfe 2010; Carpenter & DeLosh 2006; Smith, Roediger & Karpicke 2013; MacLeod et al. 2010; Dunlosky & Rawson 2012. Mayer, Multimedia Learning (2009, book) for the explainer links.

Not cited, deliberately: Mueller & Oppenheimer 2014 (pen versus keyboard), because the 2019 replication by Morehead, Dunlosky & Rawson found the effect much weaker.

## Progress: the snowball view

- **Stage pipeline.** Four columns with counts of formulas, plus a stacked bar, New to Solid.
- **Momentum.** Reviews per day for the last 14 days as small bars, and the average scheduled interval of Review cards today compared with 7 days ago, from snapshots.
- Existing panels (learned by topic, predicted recall) stay. Each row in predicted recall gains its stage.

## See it explained

Each formula may carry `links: [{ name, url }]`, one or two curated free explainers (Seeing Theory, Khan Academy, StatQuest, OpenStax). Shown on the answer side of recall, use and scenario cards and in the Formula sheet. Every URL verified live before it is committed; curation date recorded in `js/cards.js`.

## Storage

All additions are backward compatible; missing fields take defaults on load and import.

- `settings.introSeen` (false), `settings.showPad` (true).
- Log entries gain `hints` (number of hints used, 0 for scenario cards).
- `snapshots`: `{ dayKey: { stages: { new, learning, graduated, solid }, avgInterval } }`, written at wrap-up and at most once a day, kept for 60 days.

## Code organisation

- `js/guide.js` (new, pure, no DOM): stage derivation, session composition, hint ladder, nudges, automatic rating, snapshot building. Unit-tested with `node --test` in `test/`.
- `js/pad.js` (new): the scratchpad canvas component.
- `js/method.js` (new): How it works content, references data, forgetting-curve chart.
- `js/app.js`: Today route, recall loop rendering, wrap-up, Progress additions, first-visit redirect.
- `js/store.js`, `js/cards.js`, `index.html`, `css/style.css`: as described above.

## Tone covenant

Never "wrong", never "failed". Every line shown after a miss is both encouraging and true to the research, and the How it works screen is where the reasons live so cards stay short. Progress is described as movement between stages, not as a score.

## Testing

- Unit tests for `guide.js`: stage rules at each boundary, composer allocation with small and large budgets, hint ladder per kind, automatic rating.
- Browser checks in headless Chromium at 390px and 1100px, light and dark: first visit lands on How it works; Start opens Today; a new-formula card shows the pretest copy, the pad and both buttons; hints climb and auto-grade; a sketch appears beside the answer; a scenario card still grades on pick; wrap-up renders; Progress pipeline renders; every reference has a DOI link; no console errors.
- Live check after push: site returns 200, assets load, class-notes PDF still 404.

## Banked for later

- **Spec B, inline diagrams** for the formulas whose picture is the concept (z-score area, standard error narrowing with n, variance as squares, binomial bars).
- **Spec C, gamification.** Reward showing up and honest grading (streaks, sessions completed, formulas moved), never speed or "Easy" grades, because rewards for confidence push toward the overconfidence Dunlosky & Rawson documented.
- Typed-answer mode for cloze cards; service worker for offline; more decks as the course progresses; instructor notation.
