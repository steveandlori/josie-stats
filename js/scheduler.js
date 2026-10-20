// Scheduling: FSRS (ts-fsrs, default parameters) with two exam-aware additions:
//  1. a new card graduates only after three correct recalls in its first session
//     (learning steps 1m, 10m, 10m) — "successive relearning";
//  2. no review interval may exceed ~25% of the days left until the next exam
//     (Cepeda et al.: optimal gap scales with the retention interval).

import { fsrs, createEmptyCard, Rating, State, generatorParameters } from '../vendor/ts-fsrs.mjs';

export { Rating, State };

export function daysUntil(dateStr, now = new Date()) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d, 23, 59, 59);
  return Math.ceil((target - now) / 86400000);
}

export function nextExam(settings, now = new Date()) {
  const exams = [
    { name: 'midterm', date: settings.midterm, days: daysUntil(settings.midterm, now) },
    { name: 'final', date: settings.final, days: daysUntil(settings.final, now) },
  ].filter(e => e.days !== null && e.days >= 0).sort((a, b) => a.days - b.days);
  return exams[0] || null;
}

export function maxIntervalFor(settings, now = new Date()) {
  const exam = nextExam(settings, now);
  if (!exam) return 180;
  // Keep gaps to about a quarter of the time left, never shorter than 2 days.
  return Math.max(2, Math.min(180, Math.round(exam.days * 0.25)));
}

export function makeScheduler(settings, now = new Date()) {
  const params = generatorParameters({
    request_retention: settings.retention || 0.9,
    maximum_interval: maxIntervalFor(settings, now),
    enable_fuzz: true,
    enable_short_term: true,
    learning_steps: ['1m', '10m', '10m'],
    relearning_steps: ['10m'],
  });
  return fsrs(params);
}

// Stored cards keep dates as ISO strings; ts-fsrs wants Date objects.
export function hydrate(stored) {
  if (!stored) return null;
  return {
    ...stored,
    due: new Date(stored.due),
    last_review: stored.last_review ? new Date(stored.last_review) : undefined,
  };
}

export function dehydrate(card) {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review ? card.last_review.toISOString() : undefined,
  };
}

export function emptyCard(now = new Date()) {
  return createEmptyCard(now);
}

// Returns {card, log} for the chosen rating.
export function grade(scheduler, card, rating, now = new Date()) {
  const r = scheduler.next(card, now, rating);
  return { card: r.card, log: r.log };
}

export function retrievability(scheduler, card, now = new Date()) {
  if (!card || card.state === State.New) return null;
  return scheduler.get_retrievability(card, now, false);
}
