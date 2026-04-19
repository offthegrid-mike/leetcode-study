import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateNextReview,
  isDue,
  getDueCount,
  sortByReviewPriority,
  getReviewStats,
} from '../src/lib/spaced-rep.js';

describe('calculateNextReview', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2025-01-15T12:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('first successful review → interval 1, repetitions 1', () => {
    const result = calculateNextReview(null, 4);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it('second successful review → interval 6, repetitions 2', () => {
    const result = calculateNextReview({ easeFactor: 2.5, interval: 1, repetitions: 1 }, 4);
    expect(result.interval).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  it('third+ successful review → interval = prev * easeFactor', () => {
    const result = calculateNextReview({ easeFactor: 2.5, interval: 6, repetitions: 2 }, 4);
    expect(result.interval).toBe(Math.round(6 * 2.5));
    expect(result.repetitions).toBe(3);
  });

  it('failed recall (quality < 3) resets repetitions to 0 and interval to 1', () => {
    const result = calculateNextReview({ easeFactor: 2.5, interval: 10, repetitions: 5 }, 1);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
  });

  it('ease factor never drops below 1.3', () => {
    let progress = { easeFactor: 1.4, interval: 1, repetitions: 0 };
    const result = calculateNextReview(progress, 0);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('ease factor increases with quality 5', () => {
    const result = calculateNextReview({ easeFactor: 2.5, interval: 1, repetitions: 1 }, 5);
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });

  it('quality is clamped to 0-5', () => {
    const r1 = calculateNextReview(null, -3);
    const r2 = calculateNextReview(null, 10);
    // quality -3 clamped to 0 → failed recall
    expect(r1.repetitions).toBe(0);
    // quality 10 clamped to 5 → successful recall
    expect(r2.repetitions).toBe(1);
  });

  it('handles undefined/empty currentProgress', () => {
    for (const val of [null, undefined, {}]) {
      const result = calculateNextReview(val, 4);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
      expect(result.easeFactor).toBeDefined();
    }
  });

  it('returns an ISO date string for nextReview', () => {
    const result = calculateNextReview(null, 4);
    expect(() => new Date(result.nextReview).toISOString()).not.toThrow();
    // interval is 1, so nextReview should be tomorrow
    const expected = new Date('2025-01-16T12:00:00Z');
    const actual = new Date(result.nextReview);
    expect(actual.toDateString()).toBe(expected.toDateString());
  });
});

describe('isDue', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2025-01-15T12:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns false for null/undefined progress', () => {
    expect(isDue(null)).toBe(false);
    expect(isDue(undefined)).toBe(false);
  });

  it('returns false when nextReview is null', () => {
    expect(isDue({ nextReview: null })).toBe(false);
  });

  it('returns true when nextReview is today', () => {
    expect(isDue({ nextReview: '2025-01-15T00:00:00Z' })).toBe(true);
  });

  it('returns true when nextReview is in the past', () => {
    expect(isDue({ nextReview: '2025-01-10T00:00:00Z' })).toBe(true);
  });

  it('returns false when nextReview is in the future', () => {
    expect(isDue({ nextReview: '2025-01-20T00:00:00Z' })).toBe(false);
  });
});

describe('getDueCount', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2025-01-15T12:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('counts correctly with a mix of due and not-due items', () => {
    const items = [
      { nextReview: '2025-01-10T00:00:00Z' }, // due
      { nextReview: '2025-01-15T00:00:00Z' }, // due (today)
      { nextReview: '2025-01-20T00:00:00Z' }, // not due
      { nextReview: null },                    // not due
    ];
    expect(getDueCount(items)).toBe(2);
  });

  it('returns 0 for empty array', () => {
    expect(getDueCount([])).toBe(0);
  });
});

describe('sortByReviewPriority', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2025-01-15T12:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('overdue items come before non-overdue', () => {
    const progress = {
      1: { nextReview: '2025-01-10T00:00:00Z', easeFactor: 2.5 },
      2: { nextReview: '2025-01-20T00:00:00Z', easeFactor: 2.5 },
    };
    const sorted = sortByReviewPriority([2, 1], progress);
    expect(sorted).toEqual([1, 2]);
  });

  it('more overdue items come first', () => {
    const progress = {
      1: { nextReview: '2025-01-14T00:00:00Z', easeFactor: 2.5 },
      2: { nextReview: '2025-01-10T00:00:00Z', easeFactor: 2.5 },
    };
    const sorted = sortByReviewPriority([1, 2], progress);
    expect(sorted).toEqual([2, 1]);
  });

  it('among equally overdue, lower ease factor comes first', () => {
    const progress = {
      1: { nextReview: '2025-01-10T00:00:00Z', easeFactor: 2.5 },
      2: { nextReview: '2025-01-10T00:00:00Z', easeFactor: 1.5 },
    };
    const sorted = sortByReviewPriority([1, 2], progress);
    expect(sorted).toEqual([2, 1]);
  });

  it('works with Map input for allProgress', () => {
    const progress = new Map([
      [1, { nextReview: '2025-01-10T00:00:00Z', easeFactor: 2.5 }],
      [2, { nextReview: '2025-01-20T00:00:00Z', easeFactor: 2.5 }],
    ]);
    const sorted = sortByReviewPriority([2, 1], progress);
    expect(sorted).toEqual([1, 2]);
  });

  it('works with array input for allProgress', () => {
    const progress = [
      { id: 1, nextReview: '2025-01-10T00:00:00Z', easeFactor: 2.5 },
      { id: 2, nextReview: '2025-01-20T00:00:00Z', easeFactor: 2.5 },
    ];
    const sorted = sortByReviewPriority([2, 1], progress);
    expect(sorted).toEqual([1, 2]);
  });

  it('problems with no progress are handled', () => {
    const sorted = sortByReviewPriority([1, 2], {});
    expect(sorted).toHaveLength(2);
    expect(sorted).toContain(1);
    expect(sorted).toContain(2);
  });
});

describe('getReviewStats', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2025-01-15T12:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('counts dueToday, dueThisWeek, newCards, matureCards correctly', () => {
    const allProgress = [
      { nextReview: '2025-01-15T00:00:00Z', repetitions: 3, interval: 5, easeFactor: 2.5 },  // due today, not mature
      { nextReview: '2025-01-18T00:00:00Z', repetitions: 5, interval: 25, easeFactor: 2.6 }, // due this week, mature
      { nextReview: '2025-02-01T00:00:00Z', repetitions: 2, interval: 6, easeFactor: 2.3 },  // not due this week
      { nextReview: null, repetitions: 0 },                                                    // new card
    ];
    const stats = getReviewStats(allProgress);
    expect(stats.dueToday).toBe(1);
    expect(stats.dueThisWeek).toBe(2);
    expect(stats.newCards).toBe(1);
    expect(stats.matureCards).toBe(1);
  });

  it('averageEase defaults to 2.5 when no reviewed cards', () => {
    const stats = getReviewStats([{ nextReview: null, repetitions: 0 }]);
    expect(stats.averageEase).toBe(2.5);
  });

  it('cards with interval >= 21 are mature', () => {
    const allProgress = [
      { nextReview: '2025-01-10T00:00:00Z', repetitions: 5, interval: 21, easeFactor: 2.5 },
      { nextReview: '2025-01-10T00:00:00Z', repetitions: 3, interval: 20, easeFactor: 2.5 },
    ];
    const stats = getReviewStats(allProgress);
    expect(stats.matureCards).toBe(1);
  });

  it('empty array returns sensible defaults', () => {
    const stats = getReviewStats([]);
    expect(stats.dueToday).toBe(0);
    expect(stats.dueThisWeek).toBe(0);
    expect(stats.newCards).toBe(0);
    expect(stats.matureCards).toBe(0);
    expect(stats.averageEase).toBe(2.5);
  });

  it('averageEase is rounded to 2 decimal places', () => {
    const allProgress = [
      { nextReview: '2025-01-10T00:00:00Z', repetitions: 2, interval: 6, easeFactor: 2.333 },
      { nextReview: '2025-01-10T00:00:00Z', repetitions: 2, interval: 6, easeFactor: 2.777 },
    ];
    const stats = getReviewStats(allProgress);
    const str = stats.averageEase.toString();
    const decimals = str.includes('.') ? str.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});
