import { describe, it, expect } from 'vitest';
import { mergeProgress, mergeSessions } from '../src/lib/gist-sync.js';

describe('mergeProgress', () => {
  it('merges disjoint records', () => {
    const local = [{ id: 1, val: 'a' }];
    const remote = [{ id: 2, val: 'b' }];
    const merged = mergeProgress(local, remote);
    expect(merged).toHaveLength(2);
    expect(merged.find(r => r.id === 1)).toBeTruthy();
    expect(merged.find(r => r.id === 2)).toBeTruthy();
  });

  it('remote record wins when it has a newer updatedAt', () => {
    const local = [{ id: 1, val: 'old', updatedAt: '2025-01-01T00:00:00Z' }];
    const remote = [{ id: 1, val: 'new', updatedAt: '2025-01-10T00:00:00Z' }];
    const merged = mergeProgress(local, remote);
    expect(merged).toHaveLength(1);
    expect(merged[0].val).toBe('new');
  });

  it('local record wins when it has a newer updatedAt', () => {
    const local = [{ id: 1, val: 'local', updatedAt: '2025-01-10T00:00:00Z' }];
    const remote = [{ id: 1, val: 'remote', updatedAt: '2025-01-01T00:00:00Z' }];
    const merged = mergeProgress(local, remote);
    expect(merged).toHaveLength(1);
    expect(merged[0].val).toBe('local');
  });

  it('handles records without updatedAt (treated as time 0)', () => {
    const local = [{ id: 1, val: 'local' }]; // no updatedAt → 0
    const remote = [{ id: 1, val: 'remote', updatedAt: '2025-01-01T00:00:00Z' }];
    const merged = mergeProgress(local, remote);
    expect(merged[0].val).toBe('remote');
  });

  it('local wins when both lack updatedAt (same timestamp 0, remote not newer)', () => {
    const local = [{ id: 1, val: 'local' }];
    const remote = [{ id: 1, val: 'remote' }];
    const merged = mergeProgress(local, remote);
    expect(merged[0].val).toBe('local');
  });

  it('empty local array', () => {
    const merged = mergeProgress([], [{ id: 1, val: 'r' }]);
    expect(merged).toHaveLength(1);
    expect(merged[0].val).toBe('r');
  });

  it('empty remote array', () => {
    const merged = mergeProgress([{ id: 1, val: 'l' }], []);
    expect(merged).toHaveLength(1);
    expect(merged[0].val).toBe('l');
  });

  it('both empty', () => {
    expect(mergeProgress([], [])).toEqual([]);
  });

  it('duplicate IDs — newer timestamp wins', () => {
    const local = [
      { id: 1, val: 'a', updatedAt: '2025-01-01T00:00:00Z' },
      { id: 2, val: 'b', updatedAt: '2025-01-05T00:00:00Z' },
    ];
    const remote = [
      { id: 1, val: 'a2', updatedAt: '2025-01-10T00:00:00Z' },
      { id: 2, val: 'b2', updatedAt: '2025-01-02T00:00:00Z' },
    ];
    const merged = mergeProgress(local, remote);
    expect(merged).toHaveLength(2);
    expect(merged.find(r => r.id === 1).val).toBe('a2');
    expect(merged.find(r => r.id === 2).val).toBe('b');
  });
});

describe('mergeSessions', () => {
  it('adds remote sessions with new UUIDs', () => {
    const local = [{ uuid: 'aaa', date: '2025-01-01' }];
    const remote = [{ uuid: 'bbb', date: '2025-01-02' }];
    const merged = mergeSessions(local, remote);
    expect(merged).toHaveLength(2);
    expect(merged.find(s => s.uuid === 'bbb')).toBeTruthy();
  });

  it('skips remote sessions with duplicate UUIDs', () => {
    const local = [{ uuid: 'aaa', date: '2025-01-01' }];
    const remote = [{ uuid: 'aaa', date: '2025-01-01' }];
    const merged = mergeSessions(local, remote);
    expect(merged).toHaveLength(1);
  });

  it('sessions without UUID are deduped by date+problemsReviewed+quizScore', () => {
    const local = [{ date: '2025-01-01', problemsReviewed: 5, quizScore: 80 }];
    const remote = [{ date: '2025-01-01', problemsReviewed: 5, quizScore: 80 }];
    const merged = mergeSessions(local, remote);
    expect(merged).toHaveLength(1);
  });

  it('sessions without UUID that are not duplicates are added', () => {
    const local = [{ date: '2025-01-01', problemsReviewed: 5, quizScore: 80 }];
    const remote = [{ date: '2025-01-02', problemsReviewed: 3, quizScore: 90 }];
    const merged = mergeSessions(local, remote);
    expect(merged).toHaveLength(2);
  });

  it('empty local array', () => {
    const remote = [{ uuid: 'aaa', date: '2025-01-01' }];
    const merged = mergeSessions([], remote);
    expect(merged).toHaveLength(1);
  });

  it('empty remote array', () => {
    const local = [{ uuid: 'aaa', date: '2025-01-01' }];
    const merged = mergeSessions(local, []);
    expect(merged).toHaveLength(1);
  });

  it('both empty', () => {
    expect(mergeSessions([], [])).toEqual([]);
  });
});
