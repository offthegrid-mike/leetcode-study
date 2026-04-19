/**
 * SM-2 (SuperMemo 2) spaced repetition algorithm for LeetCode study.
 *
 * Quality scale: 0–5
 *   0 = complete blackout
 *   1 = Again  (incorrect, no recall)
 *   2 = Hard   (incorrect, but remembered after seeing answer)
 *   3 = Okay   (correct with serious difficulty)
 *   4 = Good   (correct with some hesitation)
 *   5 = Easy   (perfect recall)
 */

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

/**
 * Add `days` calendar days to a date, returning a new Date at the start of that day.
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Return the start-of-day (midnight local) for a given date.
 * @param {Date} date
 * @returns {Date}
 */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculate the next review schedule using the SM-2 algorithm.
 *
 * @param {{ easeFactor?: number, interval?: number, repetitions?: number }} currentProgress
 *   The learner's current progress for this problem.
 * @param {number} quality  Rating 0–5 (UI mapping: Again=1, Hard=2, Good=4, Easy=5).
 * @returns {{ easeFactor: number, interval: number, repetitions: number, nextReview: string }}
 *   Updated scheduling parameters and the ISO-8601 date string for the next review.
 */
export function calculateNextReview(currentProgress, quality) {
  const clampedQuality = Math.max(0, Math.min(5, Math.round(quality)));

  let easeFactor = currentProgress?.easeFactor ?? DEFAULT_EASE_FACTOR;
  let interval = currentProgress?.interval ?? 0;
  let repetitions = currentProgress?.repetitions ?? 0;

  if (clampedQuality < 3) {
    // Failed recall — reset
    repetitions = 0;
    interval = 1;
  } else {
    // Successful recall — graduate interval
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 10;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const delta = 0.1 - (5 - clampedQuality) * (0.08 + (5 - clampedQuality) * 0.02);
  easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor + delta);

  const nextReview = addDays(new Date(), interval).toISOString();

  return { easeFactor, interval, repetitions, nextReview };
}

/**
 * Check whether a problem is due for review on or before the given date.
 *
 * @param {{ nextReview?: string | null }} progress  Progress record for a single problem.
 * @param {Date} [date=new Date()]  The reference date (defaults to now).
 * @returns {boolean}  `true` if the problem should be reviewed.
 */
export function isDue(progress, date = new Date()) {
  if (!progress || !progress.nextReview) return false;
  return startOfDay(new Date(progress.nextReview)) <= startOfDay(date);
}

/**
 * Count how many problems are due for review on or before the given date.
 *
 * @param {Array<{ nextReview?: string | null }>} allProgress  Array of progress records.
 * @param {Date} [date=new Date()]  The reference date.
 * @returns {number}
 */
export function getDueCount(allProgress, date = new Date()) {
  return allProgress.filter((p) => isDue(p, date)).length;
}

/**
 * Sort problems by review priority.
 *
 * Ordering (highest priority first):
 *  1. Overdue problems, sorted by how overdue they are (most overdue first).
 *  2. Among equally overdue problems, lower ease factor comes first (harder cards first).
 *  3. Problems that are not due are placed at the end.
 *
 * @param {number[]} problems  Array of problem IDs to sort.
 * @param {Map<number,object>|Object.<number,object>|Array<object>} allProgress
 *   Progress records keyed/indexed by problem ID. Accepts a Map, a plain object,
 *   or an array of records that each contain an `id` property.
 * @returns {number[]}  A new array of problem IDs sorted by priority.
 */
export function sortByReviewPriority(problems, allProgress) {
  // Normalise allProgress into a lookup function
  let lookup;
  if (allProgress instanceof Map) {
    lookup = (id) => allProgress.get(id);
  } else if (Array.isArray(allProgress)) {
    const map = new Map(allProgress.map((p) => [p.id, p]));
    lookup = (id) => map.get(id);
  } else {
    lookup = (id) => allProgress[id];
  }

  const now = startOfDay(new Date());

  return [...problems].sort((a, b) => {
    const pa = lookup(a);
    const pb = lookup(b);

    const dueA = pa?.nextReview ? startOfDay(new Date(pa.nextReview)) : null;
    const dueB = pb?.nextReview ? startOfDay(new Date(pb.nextReview)) : null;

    const overdueA = dueA ? now - dueA : -Infinity;
    const overdueB = dueB ? now - dueB : -Infinity;

    const isOverdueA = overdueA >= 0 && dueA !== null;
    const isOverdueB = overdueB >= 0 && dueB !== null;

    // Overdue items always come before non-overdue items
    if (isOverdueA && !isOverdueB) return -1;
    if (!isOverdueA && isOverdueB) return 1;

    // Both overdue — most overdue first
    if (isOverdueA && isOverdueB) {
      if (overdueA !== overdueB) return overdueB - overdueA; // flip: larger overdue first
      // Tie-break: lower ease factor first (harder cards)
      return (pa?.easeFactor ?? DEFAULT_EASE_FACTOR) - (pb?.easeFactor ?? DEFAULT_EASE_FACTOR);
    }

    // Neither overdue — lower ease factor first
    return (pa?.easeFactor ?? DEFAULT_EASE_FACTOR) - (pb?.easeFactor ?? DEFAULT_EASE_FACTOR);
  });
}

/**
 * Compute aggregate review statistics from all progress records.
 *
 * @param {Array<object>} allProgress  Array of progress records.
 * @returns {{
 *   dueToday: number,
 *   dueThisWeek: number,
 *   newCards: number,
 *   matureCards: number,
 *   averageEase: number
 * }}
 */
export function getReviewStats(allProgress) {
  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 7);

  let dueToday = 0;
  let dueThisWeek = 0;
  let newCards = 0;
  let matureCards = 0;
  let easeSum = 0;
  let easeCount = 0;

  for (const p of allProgress) {
    // Cards that have never been reviewed are "new"
    if (!p.nextReview || p.repetitions === 0 || p.repetitions === undefined) {
      newCards++;
      continue;
    }

    const reviewDate = startOfDay(new Date(p.nextReview));

    if (reviewDate <= today) dueToday++;
    if (reviewDate <= weekEnd) dueThisWeek++;

    // "Mature" = interval >= 21 days (standard Anki threshold)
    if ((p.interval ?? 0) >= 21) matureCards++;

    easeSum += p.easeFactor ?? DEFAULT_EASE_FACTOR;
    easeCount++;
  }

  return {
    dueToday,
    dueThisWeek,
    newCards,
    matureCards,
    averageEase: easeCount > 0 ? Math.round((easeSum / easeCount) * 100) / 100 : DEFAULT_EASE_FACTOR,
  };
}
