// "How it works": the method behind Stats Cards and the research it rests on.
// Every reference below was resolved against doi.org on 2026-10-20. Claims were reviewed
// against the cited abstracts; keep wording within what the papers found.

export const REFERENCES = [
  { authors: 'Roediger, H. L., & Karpicke, J. D.', year: 2006, title: 'Test-enhanced learning: Taking memory tests improves long-term retention', journal: 'Psychological Science, 17(3), 249–255', doi: '10.1111/j.1467-9280.2006.01693.x' },
  { authors: 'Karpicke, J. D., & Roediger, H. L.', year: 2008, title: 'The critical importance of retrieval for learning', journal: 'Science, 319(5865), 966–968', doi: '10.1126/science.1152408' },
  { authors: 'Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T.', year: 2013, title: 'Improving students’ learning with effective learning techniques: Promising directions from cognitive and educational psychology', journal: 'Psychological Science in the Public Interest, 14(1), 4–58', doi: '10.1177/1529100612453266' },
  { authors: 'Kornell, N., Hays, M. J., & Bjork, R. A.', year: 2009, title: 'Unsuccessful retrieval attempts enhance subsequent learning', journal: 'Journal of Experimental Psychology: Learning, Memory, and Cognition, 35(4), 989–998', doi: '10.1037/a0015729' },
  { authors: 'Richland, L. E., Kornell, N., & Kao, L. S.', year: 2009, title: 'The pretesting effect: Do unsuccessful retrieval attempts enhance learning?', journal: 'Journal of Experimental Psychology: Applied, 15(3), 243–257', doi: '10.1037/a0016496' },
  { authors: 'Potts, R., & Shanks, D. R.', year: 2014, title: 'The benefit of generating errors during learning', journal: 'Journal of Experimental Psychology: General, 143(2), 644–667', doi: '10.1037/a0033194' },
  { authors: 'Kapur, M.', year: 2014, title: 'Productive failure in learning math', journal: 'Cognitive Science, 38(5), 1008–1022', doi: '10.1111/cogs.12107' },
  { authors: 'Metcalfe, J.', year: 2017, title: 'Learning from errors', journal: 'Annual Review of Psychology, 68, 465–489', doi: '10.1146/annurev-psych-010416-044022' },
  { authors: 'Pan, S. C., & Sana, F.', year: 2021, title: 'Pretesting versus posttesting: Comparing the pedagogical benefits of errorful generation and retrieval practice', journal: 'Journal of Experimental Psychology: Applied, 27(2), 237–257', doi: '10.1037/xap0000345' },
  { authors: 'Grimaldi, P. J., & Karpicke, J. D.', year: 2012, title: 'When and why do retrieval attempts enhance subsequent encoding?', journal: 'Memory & Cognition, 40(4), 505–513', doi: '10.3758/s13421-011-0174-0' },
  { authors: 'Little, J. L., & Bjork, E. L.', year: 2016, title: 'Multiple-choice pretesting potentiates learning of related information', journal: 'Memory & Cognition, 44(7), 1085–1101', doi: '10.3758/s13421-016-0621-z' },
  { authors: 'Finn, B., & Metcalfe, J.', year: 2010, title: 'Scaffolding feedback to maximize long-term error correction', journal: 'Memory & Cognition, 38(7), 951–961', doi: '10.3758/MC.38.7.951' },
  { authors: 'Carpenter, S. K., & DeLosh, E. L.', year: 2006, title: 'Impoverished cue support enhances subsequent retention: Support for the elaborative retrieval explanation of the testing effect', journal: 'Memory & Cognition, 34(2), 268–276', doi: '10.3758/BF03193405' },
  { authors: 'Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D.', year: 2006, title: 'Distributed practice in verbal recall tasks: A review and quantitative synthesis', journal: 'Psychological Bulletin, 132(3), 354–380', doi: '10.1037/0033-2909.132.3.354' },
  { authors: 'Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H.', year: 2008, title: 'Spacing effects in learning: A temporal ridgeline of optimal retention', journal: 'Psychological Science, 19(11), 1095–1102', doi: '10.1111/j.1467-9280.2008.02209.x' },
  { authors: 'Rawson, K. A., & Dunlosky, J.', year: 2011, title: 'Optimizing schedules of retrieval practice for durable and efficient learning: How much is enough?', journal: 'Journal of Experimental Psychology: General, 140(3), 283–302', doi: '10.1037/a0023956' },
  { authors: 'Ye, J., Su, J., & Cao, Y.', year: 2022, title: 'A stochastic shortest path algorithm for optimizing spaced repetition scheduling', journal: 'Proceedings of the 28th ACM SIGKDD Conference on Knowledge Discovery and Data Mining, 4381–4390', doi: '10.1145/3534678.3539081' },
  { authors: 'Rohrer, D., & Taylor, K.', year: 2007, title: 'The shuffling of mathematics problems improves learning', journal: 'Instructional Science, 35(6), 481–498', doi: '10.1007/s11251-007-9015-8' },
  { authors: 'Rohrer, D., Dedrick, R. F., & Stershic, S.', year: 2015, title: 'Interleaved practice improves mathematics learning', journal: 'Journal of Educational Psychology, 107(3), 900–908', doi: '10.1037/edu0000001' },
  { authors: 'Smith, M. A., Roediger, H. L., & Karpicke, J. D.', year: 2013, title: 'Covert retrieval practice benefits retention as much as overt retrieval practice', journal: 'Journal of Experimental Psychology: Learning, Memory, and Cognition, 39(6), 1712–1725', doi: '10.1037/a0033569' },
  { authors: 'MacLeod, C. M., Gopie, N., Hourihan, K. L., Neary, K. R., & Ozubko, J. D.', year: 2010, title: 'The production effect: Delineation of a phenomenon', journal: 'Journal of Experimental Psychology: Learning, Memory, and Cognition, 36(3), 671–685', doi: '10.1037/a0018785' },
  { authors: 'Dunlosky, J., & Rawson, K. A.', year: 2012, title: 'Overconfidence produces underachievement: Inaccurate self evaluations undermine students’ learning and retention', journal: 'Learning and Instruction, 22(4), 271–280', doi: '10.1016/j.learninstruc.2011.08.003' },
  { authors: 'Mayer, R. E.', year: 2009, title: 'Multimedia learning (2nd ed.)', journal: 'Cambridge University Press', doi: '10.1017/CBO9780511811678' },
  { authors: 'Little, J. L., Bjork, E. L., Bjork, R. A., & Angello, G.', year: 2012, title: 'Multiple-choice tests exonerated, at least of some charges: Fostering test-induced learning and avoiding test-induced forgetting', journal: 'Psychological Science, 23(11), 1337–1344', doi: '10.1177/0956797612443370' },
];

// Cite by array position (1-based). Keeping citations as numbers keeps the prose readable.
const cite = (...ns) => `<sup class="cite">${ns.map(n => `<a href="#ref-${n}">${n}</a>`).join(',')}</sup>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// An illustrative forgetting curve: recall decays as exp(-t/S); each review resets it to full
// and multiplies S (how slowly it decays). Shapes only, not the learner's data and not FSRS's exact model.
export function forgettingCurveSVG() {
  const W = 560, H = 230, L = 44, R = 16, T = 16, B = 40;
  const pw = W - L - R, ph = H - T - B;
  const days = 30;
  const x = t => L + (t / days) * pw;
  const y = r => T + (1 - r) * ph;
  const recall = (t, S) => Math.exp(-t / S);
  const S0 = 2, GROW = 2.2;

  // With reviews at days 1, 3, 8, 18; each review resets recall to 100% and slows the next decline.
  const reviews = [1, 3, 8, 18];
  let S = S0, start = 0;
  const d = [];
  const points = [];
  for (const rv of [...reviews, days]) {
    for (let t = start; t <= rv + 1e-9; t += 0.25) d.push(`${d.length ? 'L' : 'M'}${x(t).toFixed(1)},${y(recall(t - start, S)).toFixed(1)}`);
    if (rv < days) {
      points.push([x(rv), y(recall(rv - start, S))]);
      d.push(`L${x(rv).toFixed(1)},${y(1).toFixed(1)}`); // the reset
      S *= GROW; start = rv;
    }
  }
  const withPath = d.join(' ');
  const finalR = recall(days - 18, S0 * GROW ** 4);
  // Without review: one decay from day 0.
  const noPts = [];
  for (let t = 0; t <= days; t += 0.5) noPts.push(`${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${y(recall(t, S0)).toFixed(1)}`);
  const sample = [0, 1, 3, 8, 18, 30].map(t => {
    let s = S0, st = 0;
    for (const rv of reviews) { if (t > rv) { s *= GROW; st = rv; } }
    return { t, w: Math.round(recall(t - st, s) * 100), n: Math.round(recall(t, S0) * 100) };
  });
  const grid = [0.5, 1].map(r => `<line x1="${L}" x2="${W - R}" y1="${y(r).toFixed(1)}" y2="${y(r).toFixed(1)}" class="grid"/>`).join('');
  const dots = points.map(([px, py]) => `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5" class="dot"/>`).join('');
  const reviewTicks = reviews.map(d => `<text x="${x(d).toFixed(1)}" y="${H - B + 16}" class="lbl" text-anchor="middle">${d}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="curve" role="img" aria-labelledby="curve-title curve-desc">
    <title id="curve-title">Forgetting curve with spaced reviews</title>
    <desc id="curve-desc">Chance of recall falls after learning. Each review resets it to full and makes the next decline slower, so reviews can be spaced further apart. Without review it keeps falling.</desc>
    ${grid}
    <line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" class="axis"/>
    <text x="${L - 6}" y="${y(1) + 4}" class="lbl" text-anchor="end">100%</text>
    <text x="${L - 6}" y="${y(0.5) + 4}" class="lbl" text-anchor="end">50%</text>
    <text x="${L - 6}" y="${y(0) + 4}" class="lbl" text-anchor="end">0</text>
    <path d="${noPts.join(' ')}" class="no-review"/>
    <path d="${withPath}" class="with-review"/>
    ${dots}
    <text x="${x(days) - 4}" y="${(y(finalR) - 16).toFixed(1)}" class="lbl strong" text-anchor="end">with reviews</text>
    <text x="${x(days) - 4}" y="${(y(recall(days, S0)) - 8).toFixed(1)}" class="lbl" text-anchor="end">without review</text>
    ${reviewTicks}
    <text x="${x(days)}" y="${H - B + 16}" class="lbl" text-anchor="end">day ${days}</text>
    <text x="${L}" y="${H - 6}" class="lbl">reviews on days 1, 3, 8 and 18</text>
  </svg>
  <table class="sr-only"><caption>Chance of recall by day</caption><tr><th>Day</th><th>With reviews</th><th>Without review</th></tr>
  ${sample.map(s => `<tr><td>${s.t}</td><td>${s.w}%</td><td>${s.n}%</td></tr>`).join('')}</table>`;
}

const STEPS = [
  { n: 1, title: 'Guess, even a rough one', body: 'Read the question and try to answer it in your head, out loud, or in the writing pad. A guess that turns out wrong is not a waste. Trying first helps the answer stick.' },
  { n: 2, title: 'Take a hint only if you are stuck', body: 'Each hint gives away a little more: what the formula computes, which symbols it uses, then its shape with a blank. Less help at the moment of recall means a stronger memory afterwards.' },
  { n: 3, title: 'Reveal it and read it aloud once', body: 'Compare the answer with what you had. Saying it out loud is a small extra push into memory.' },
  { n: 4, title: 'Grade yourself honestly', body: 'Not yet, Partly, or Got it. Partly means you made progress but did not have all of it; the card keeps what it has gained and comes back sooner. If you used a hint the card grades itself, so you never have to decide whether a helped answer counts.' },
];

const WHY = [
  {
    title: 'Guess before you look',
    evidence: `Trying to answer before you know the answer improves what you learn from it, even when the guess is wrong${cite(4, 5, 6)}. In mathematics, students who attempt problems before being taught the method end up as good at the procedure and better at understanding and transferring it${cite(7)}, and a review of the field concludes that errors followed by correction help learning rather than harm it${cite(8)}. A guess seems to work by activating what you already know around the answer, so the correction has something to attach to${cite(10)}. Guessing before you learn something and recalling it afterwards both improve memory compared with no test at all, and in a head-to-head comparison guessing first did at least as well${cite(9)}. A multiple-choice pretest also improves what you pick up about related material when you study it afterwards${cite(11)}, and a multiple-choice question with plausible wrong options, like the Which formula? cards, makes you weigh each option, which can strengthen what you know about the options you rejected as well as the one you chose${cite(24)}.`,
    applied: 'Every new formula arrives as a question, with a note that you have not met it yet and an invitation to guess anyway.',
  },
  {
    title: 'Retrieval beats rereading',
    evidence: `Students who read a passage once and then tried to recall it remembered more a week later than students who reread it several times, even though the rereaders felt more confident${cite(1)}. In a follow-up, what mattered was repeatedly recalling the material; repeated studying after the first successful recall added little${cite(2)}. A review of ten common study techniques rated practice testing one of only two with high utility across ages, materials and settings; the other was spacing practice over time${cite(3)}.`,
    applied: 'Every card is a question. You never just read a formula; you reach for it.',
  },
  {
    title: 'Hints, not answers',
    evidence: `When learners answered incorrectly, revealing the correct answer gradually, a little at a time until they produced it, led to better correction a day later than showing the whole answer at once${cite(12)}. Less support at the moment of recall also produced better retention later${cite(13)}.`,
    applied: 'Give me a hint climbs a ladder, each step giving away as little as possible. A hinted answer is graded for you and comes back sooner.',
  },
  {
    title: 'Spacing beats cramming',
    evidence: `Spreading practice over time beats massing it: a review of 254 studies found spaced practice better in almost every one${cite(14)}. The best gap grows with how long you need to remember, so material for an exam months away is best revisited at gaps of weeks rather than days${cite(15)}. In the first session, three correct recalls is an efficient stopping point; pushing well past it adds little${cite(16)}. Stats Cards schedules each card with FSRS, an open scheduler built on a memory model that was published after being fitted to 220 million real review records, which predicts when you are about to forget${cite(17)}.`,
    applied: 'A new card comes back within minutes until you have recalled it three times. After that the gaps grow, and no gap runs past about a quarter of the time left before your next exam.',
    figure: true,
  },
  {
    title: 'Mixing beats blocking',
    evidence: `Practising one kind of problem at a time feels easier, but mixing problem types across a session roughly tripled scores (63% against 20%) on a test a week later for college students learning geometry formulas${cite(18)}, and a classroom study with seventh graders found a large advantage for mixed practice a month later${cite(19)}. Mixed practice forces you to decide which method applies, which is what an exam asks of you.`,
    applied: 'Today’s stack is shuffled across topics, and the Tell apart phase puts look-alike formulas side by side.',
  },
  {
    title: 'Think, write, say',
    evidence: `Recalling an answer silently strengthens memory about as much as writing or typing it does${cite(20)}, so thinking counts. What writing adds is honesty: a written answer shows exactly what you had and what you were missing, while an answer kept in your head is easy to grade too kindly, and overrating your own answers is one way students end up remembering less than they expect${cite(22)}. Reading some items aloud makes them stand out from the ones you read silently, which is why the app asks for it only now and then${cite(21)}.`,
    applied: 'The card nudges you to say it, write it, or picture it in turn. The writing pad shows your answer beside the formula so grading is a comparison, not a feeling.',
  },
  {
    title: 'Honest grading',
    evidence: `Students who misjudged their own answers, usually too generously, remembered less two days later than students who judged them accurately, even after allowing for how much they practised${cite(22)}. A few grades with clear meanings remove the temptation to call a miss something better than it was.`,
    applied: 'Not yet, Partly and Got it. Partly records progress without perfection: the card keeps the ground it has gained instead of starting over, and comes back a little sooner than a full recall would. Only Got it counts toward the three clean recalls a card needs to graduate. When you used a hint, the card grades itself Partly or Not yet.',
  },
  {
    title: 'A picture where it helps',
    evidence: `People learn better from words together with relevant pictures than from words alone${cite(23)}. Many of these formulas are pictures in disguise: a z-score is a position under a curve, standard error is a sampling distribution narrowing as n grows.`,
    applied: 'Most formulas carry a See it explained link to a free visual explainer from Seeing Theory, StatQuest or OpenStax.',
  },
];

export function methodHTML({ firstVisit = false, formulaCount = 37 } = {}) {
  const steps = STEPS.map(s => `<div class="step"><b class="n">${s.n}</b><div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div></div>`).join('');
  const why = WHY.map(w => `<section class="why"><h3>${esc(w.title)}</h3><p class="evidence">${w.evidence}</p>
    ${w.figure ? `<figure class="figure">${forgettingCurveSVG()}<figcaption>Each review resets the chance of recall and slows the next decline, which is why the gaps can grow. Illustrative curve, not your data.</figcaption></figure>` : ''}
    <p class="applied"><strong>In the app:</strong> ${esc(w.applied)}</p></section>`).join('');
  const refs = REFERENCES.map((r, i) => `<li id="ref-${i + 1}">${esc(r.authors)} (${r.year}). ${esc(r.title)}. <em>${esc(r.journal)}</em>. <a href="https://doi.org/${r.doi}" target="_blank" rel="noopener">doi:${esc(r.doi)}</a></li>`).join('');
  return `<article class="method">
    <h1>How it works</h1>
    <p class="lead">Stats Cards is self-graded. Think of the answer, reveal it, then say honestly whether you had it. Nothing has to be typed. The method below is what the research on learning says works, applied to ${formulaCount} formulas.</p>
    ${firstVisit ? `<p class="first"><a class="btn btn-primary" href="#today">Start today’s session</a><span class="muted">Or read on, about three minutes.</span></p>` : ''}
    <h2>A card, step by step</h2>
    <div class="steps">${steps}</div>
    <h2>Why it works</h2>
    ${why}
    <h2>How a formula moves</h2>
    <div class="stage-flow">
      <div><b>New</b><span>Not met yet.</span></div>
      <div><b>Learning</b><span>Met. Comes back within minutes until you have recalled it three times.</span></div>
      <div><b>Graduated</b><span>Comes back over days. Its look-alikes start appearing beside it.</span></div>
      <div><b>Solid</b><span>A week or more between reviews, and you can pick it out among look-alikes.</span></div>
    </div>
    <h2>References</h2>
    <ol class="refs">${refs}</ol>
    <p class="first end"><a class="btn btn-primary" href="#today">${firstVisit ? 'Start today’s session' : 'Back to today’s session'}</a></p>
  </article>`;
}
