import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  escapeHtml,
  createElement,
  formatDate,
  timeAgo,
  debounce,
  shuffleArray,
  getCategoryColor,
  getDifficultyColor,
  generateId,
  showToast,
} from '../src/utils/helpers.js';

describe('escapeHtml', () => {
  it('escapes < and >', () => {
    expect(escapeHtml('<script>')).not.toContain('<');
    expect(escapeHtml('<script>')).not.toContain('>');
  });

  it('escapes &', () => {
    expect(escapeHtml('a & b')).toContain('&amp;');
  });

  it('leaves double quotes unchanged (textContent/innerHTML does not escape them)', () => {
    expect(escapeHtml('"hello"')).toContain('"');
  });

  it('returns plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('createElement', () => {
  it('creates an element with the correct tag', () => {
    const el = createElement('div');
    expect(el.tagName).toBe('DIV');
  });

  it('sets className', () => {
    const el = createElement('span', 'my-class');
    expect(el.className).toBe('my-class');
  });

  it('sets string content as innerHTML', () => {
    const el = createElement('p', null, '<b>bold</b>');
    expect(el.querySelector('b')).not.toBeNull();
    expect(el.innerHTML).toBe('<b>bold</b>');
  });

  it('appends Node content', () => {
    const child = document.createElement('span');
    child.textContent = 'child';
    const el = createElement('div', null, child);
    expect(el.firstChild).toBe(child);
  });

  it('handles null className and content', () => {
    const el = createElement('div', null, null);
    expect(el.className).toBe('');
    expect(el.innerHTML).toBe('');
  });
});

describe('formatDate', () => {
  it('formats a Date object', () => {
    const d = new Date('2025-01-15T00:00:00Z');
    const formatted = formatDate(d);
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('2025');
  });

  it('formats a date string', () => {
    const formatted = formatDate('2025-06-01');
    expect(formatted).toContain('2025');
  });
});

describe('timeAgo', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2025-01-15T12:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns "just now" for recent times', () => {
    expect(timeAgo(new Date('2025-01-15T11:59:50Z'))).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(timeAgo(new Date('2025-01-15T11:55:00Z'))).toBe('5 minutes ago');
  });

  it('returns "1 minute ago" (singular)', () => {
    expect(timeAgo(new Date('2025-01-15T11:59:00Z'))).toBe('1 minute ago');
  });

  it('returns hours ago', () => {
    expect(timeAgo(new Date('2025-01-15T09:00:00Z'))).toBe('3 hours ago');
  });

  it('returns days ago', () => {
    expect(timeAgo(new Date('2025-01-13T12:00:00Z'))).toBe('2 days ago');
  });

  it('returns weeks ago', () => {
    expect(timeAgo(new Date('2025-01-01T12:00:00Z'))).toBe('2 weeks ago');
  });

  it('returns months ago', () => {
    expect(timeAgo(new Date('2024-11-15T12:00:00Z'))).toBe('2 months ago');
  });

  it('returns years ago', () => {
    expect(timeAgo(new Date('2024-01-10T12:00:00Z'))).toBe('1 year ago');
    expect(timeAgo(new Date('2023-01-15T12:00:00Z'))).toBe('2 years ago');
  });

  it('accepts a date string', () => {
    expect(timeAgo('2025-01-15T11:55:00Z')).toBe('5 minutes ago');
  });
});

describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('only calls function after delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('resets timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    vi.advanceTimersByTime(100);
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('passes arguments to the original function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a', 'b');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('a', 'b');
  });
});

describe('shuffleArray', () => {
  it('returns same-length array with same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled).toHaveLength(arr.length);
    expect(shuffled.sort()).toEqual([...arr].sort());
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(copy);
  });

  it('handles empty array', () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it('handles single-element array', () => {
    expect(shuffleArray([42])).toEqual([42]);
  });
});

describe('getCategoryColor', () => {
  it('returns correct color for known categories', () => {
    expect(getCategoryColor('Trees')).toBe('#22c55e');
    expect(getCategoryColor('Dynamic Programming')).toBe('#ef4444');
    expect(getCategoryColor('Stack')).toBe('#f59e0b');
  });

  it('returns fallback for unknown category', () => {
    expect(getCategoryColor('Unknown Category')).toBe('#6b7280');
  });
});

describe('getDifficultyColor', () => {
  it('returns correct color for Easy/Medium/Hard', () => {
    expect(getDifficultyColor('Easy')).toBe('#22c55e');
    expect(getDifficultyColor('Medium')).toBe('#f59e0b');
    expect(getDifficultyColor('Hard')).toBe('#ef4444');
  });

  it('returns fallback for unknown difficulty', () => {
    expect(getDifficultyColor('Extreme')).toBe('#6b7280');
  });
});

describe('generateId', () => {
  it('returns an 8-character string', () => {
    const id = generateId();
    expect(id).toHaveLength(8);
  });

  it('returns alphanumeric characters', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it('generates different IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId()));
    expect(ids.size).toBeGreaterThan(1);
  });
});

describe('showToast', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('creates a toast element in the DOM', () => {
    showToast('Hello');
    const toast = document.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe('Hello');
  });

  it('removes existing toast first', () => {
    showToast('First');
    showToast('Second');
    const toasts = document.querySelectorAll('.toast');
    expect(toasts).toHaveLength(1);
    expect(toasts[0].textContent).toBe('Second');
  });

  it('uses textContent (not innerHTML) to set message', () => {
    showToast('<b>XSS</b>');
    const toast = document.querySelector('.toast');
    expect(toast.innerHTML).not.toContain('<b>');
    expect(toast.textContent).toBe('<b>XSS</b>');
  });

  it('applies type class', () => {
    showToast('msg', 'error');
    const toast = document.querySelector('.toast');
    expect(toast.classList.contains('toast-error')).toBe(true);
  });
});
