import { createElement, getCategoryColor, getDifficultyColor, debounce, escapeHtml } from '../utils/helpers.js';
import { getBookmarks } from '../lib/storage.js';

const CATEGORIES = [
  'All', 'Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack',
  'Binary Search', 'Linked List', 'Trees', 'Tries', 'Heap / Priority Queue',
  'Backtracking', 'Graphs', 'Dynamic Programming', '2-D Dynamic Programming',
  'Greedy', 'Intervals', 'Math & Bit Manipulation', 'Advanced Graphs'
];

const ITEMS_PER_PAGE = 20;

let filters = { category: 'All', difficulty: 'All', status: 'All', complexity: 'All', search: '', sort: 'default', page: 1, neetcode150: false };

function matchesSearch(problem, query) {
  const q = query.toLowerCase();
  return (
    problem.title.toLowerCase().includes(q) ||
    (problem.approach || '').toLowerCase().includes(q) ||
    (problem.key_insight || '').toLowerCase().includes(q) ||
    (problem.hints || []).some(h => h.toLowerCase().includes(q)) ||
    (problem.patterns || []).some(p => p.toLowerCase().includes(q))
  );
}

function sortProblems(problems, sortKey, progress) {
  const sorted = [...problems];
  switch (sortKey) {
    case 'difficulty': {
      const order = { Easy: 0, Medium: 1, Hard: 2 };
      return sorted.sort((a, b) => (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1));
    }
    case 'category':
      return sorted.sort((a, b) => a.category.localeCompare(b.category));
    case 'last-reviewed': {
      return sorted.sort((a, b) => {
        const aTime = progress[a.id]?.lastReviewed ? new Date(progress[a.id].lastReviewed) : new Date(0);
        const bTime = progress[b.id]?.lastReviewed ? new Date(progress[b.id].lastReviewed) : new Date(0);
        return bTime - aTime;
      });
    }
    case 'due-soonest': {
      return sorted.sort((a, b) => {
        const aNext = progress[a.id]?.nextReview ? new Date(progress[a.id].nextReview) : new Date('2099-01-01');
        const bNext = progress[b.id]?.nextReview ? new Date(progress[b.id].nextReview) : new Date('2099-01-01');
        return aNext - bNext;
      });
    }
    default:
      return sorted;
  }
}

export async function renderProblemList(container, problems, progress) {
  container.innerHTML = '';

  const page = createElement('div', 'page-problems');

  // Search bar
  const searchBar = createElement('div', 'search-bar');
  const searchLabel = createElement('label', 'sr-only', 'Search problems');
  searchLabel.setAttribute('for', 'problemSearch');
  const searchInput = createElement('input', 'search-input');
  searchInput.type = 'search';
  searchInput.id = 'problemSearch';
  searchInput.placeholder = 'Search problems, approaches, patterns...';
  searchInput.value = filters.search;
  searchBar.appendChild(searchLabel);
  searchBar.appendChild(searchInput);
  page.appendChild(searchBar);

  // Category filter chips
  const chipBar = createElement('div', 'category-filter');
  chipBar.setAttribute('role', 'radiogroup');
  chipBar.setAttribute('aria-label', 'Filter by category');
  CATEGORIES.forEach(cat => {
    const chip = createElement('button', `filter-chip${filters.category === cat ? ' active' : ''}`, cat);
    chip.setAttribute('role', 'radio');
    chip.setAttribute('aria-checked', filters.category === cat ? 'true' : 'false');
    chip.addEventListener('click', () => {
      filters.category = cat;
      filters.search = '';
      filters.page = 1;
      renderProblemList(container, problems, progress);
    });
    chipBar.appendChild(chip);
  });
  page.appendChild(chipBar);

  // Difficulty + Status + Sort filters
  const filterRow = createElement('div', 'filter-row');

  const diffSelect = createElement('select', 'filter-select');
  ['All', 'Easy', 'Medium', 'Hard'].forEach(d => {
    const opt = createElement('option', '', d);
    opt.value = d;
    opt.selected = filters.difficulty === d;
    diffSelect.appendChild(opt);
  });
  diffSelect.addEventListener('change', () => {
    filters.difficulty = diffSelect.value;
    filters.search = '';
    filters.page = 1;
    renderProblemList(container, problems, progress);
  });

  const statusSelect = createElement('select', 'filter-select');
  ['All', 'Not Started', 'Attempted', 'Reviewing', 'Mastered', 'Bookmarked'].forEach(s => {
    const opt = createElement('option', '', s);
    opt.value = s;
    opt.selected = filters.status === s;
    statusSelect.appendChild(opt);
  });
  statusSelect.addEventListener('change', () => {
    filters.status = statusSelect.value;
    filters.search = '';
    filters.page = 1;
    renderProblemList(container, problems, progress);
  });

  const sortSelect = createElement('select', 'filter-select');
  [
    { value: 'default', label: 'Sort: Default' },
    { value: 'difficulty', label: 'Sort: Difficulty' },
    { value: 'category', label: 'Sort: Category' },
    { value: 'last-reviewed', label: 'Sort: Last Reviewed' },
    { value: 'due-soonest', label: 'Sort: Due Soonest' },
  ].forEach(({ value, label }) => {
    const opt = createElement('option', '', label);
    opt.value = value;
    opt.selected = filters.sort === value;
    sortSelect.appendChild(opt);
  });
  sortSelect.addEventListener('change', () => {
    filters.sort = sortSelect.value;
    filters.page = 1;
    renderProblemList(container, problems, progress);
  });

  // NeetCode 150 toggle
  const neetcodeToggle = createElement('button', `filter-toggle${filters.neetcode150 ? ' active' : ''}`, '⭐ NeetCode 150');
  neetcodeToggle.title = 'Show only NeetCode 150 problems';
  neetcodeToggle.addEventListener('click', () => {
    filters.neetcode150 = !filters.neetcode150;
    filters.page = 1;
    renderProblemList(container, problems, progress);
  });

  filterRow.appendChild(neetcodeToggle);
  filterRow.appendChild(diffSelect);
  filterRow.appendChild(statusSelect);
  filterRow.appendChild(sortSelect);

  // Complexity filter
  const complexitySelect = createElement('select', 'filter-select');
  ['All', 'O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'].forEach(c => {
    const opt = createElement('option', '', c === 'All' ? 'Complexity: All' : c);
    opt.value = c;
    opt.selected = filters.complexity === c;
    complexitySelect.appendChild(opt);
  });
  complexitySelect.addEventListener('change', () => {
    filters.complexity = complexitySelect.value;
    filters.page = 1;
    renderProblemList(container, problems, progress);
  });
  filterRow.appendChild(complexitySelect);
  page.appendChild(filterRow);

  // Filter problems
  const bookmarks = filters.status === 'Bookmarked' ? await getBookmarks() : [];
  let filtered = problems.filter(p => {
    if (filters.neetcode150 && !p.neetcode150) return false;
    if (filters.category !== 'All' && p.category !== filters.category) return false;
    if (filters.difficulty !== 'All' && p.difficulty !== filters.difficulty) return false;
    if (filters.search && !matchesSearch(p, filters.search)) return false;
    if (filters.complexity !== 'All' && p.time_complexity) {
      if (!p.time_complexity.includes(filters.complexity)) return false;
    }
    if (filters.status === 'Bookmarked') {
      return bookmarks.includes(p.id);
    }
    if (filters.status !== 'All') {
      const prog = progress[p.id];
      const status = prog?.status || 'not_started';
      const statusMap = { 'Not Started': 'not_started', 'Attempted': 'attempted', 'Reviewing': 'reviewing', 'Mastered': 'mastered' };
      if (status !== statusMap[filters.status]) return false;
    }
    return true;
  });

  // Sort
  filtered = sortProblems(filtered, filters.sort, progress);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  if (filters.page > totalPages) filters.page = totalPages;
  const startIdx = (filters.page - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  // Results count
  const count = createElement('div', 'results-count', `${filtered.length} problem${filtered.length !== 1 ? 's' : ''}${totalPages > 1 ? ` · Page ${filters.page}/${totalPages}` : ''}`);
  page.appendChild(count);

  // Problem cards grid
  const grid = createElement('div', 'problem-list');
  pageItems.forEach(problem => {
    const prog = progress[problem.id];
    const status = prog?.status || 'not_started';
    const card = createElement('div', 'problem-card');
    card.innerHTML = `
      <div class="problem-card-header">
        <span class="problem-id">#${problem.id}</span>
        <span class="difficulty-badge" style="background:${getDifficultyColor(problem.difficulty)}">${problem.difficulty}</span>
      </div>
      <h3 class="problem-card-title">${escapeHtml(problem.title)}</h3>
      <div class="problem-card-meta">
        <span class="problem-category" style="color:${getCategoryColor(problem.category)}">${problem.category}</span>
      </div>
      <div class="problem-card-footer">
        <div class="status-indicator status-${status}"></div>
        <div class="problem-patterns">${problem.patterns.map(p => `<span class="pattern-tag">${p}</span>`).join('')}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      window.location.hash = `#/problems/${problem.id}`;
    });
    grid.appendChild(card);
  });
  page.appendChild(grid);

  // Pagination controls
  if (totalPages > 1) {
    const pagination = createElement('div', 'pagination-bar');
    const prevBtn = createElement('button', 'btn btn-ghost', '← Prev');
    prevBtn.disabled = filters.page <= 1;
    prevBtn.addEventListener('click', () => {
      filters.page--;
      renderProblemList(container, problems, progress);
    });

    const pageInfo = createElement('span', 'pagination-info', `${filters.page} / ${totalPages}`);

    const nextBtn = createElement('button', 'btn btn-ghost', 'Next →');
    nextBtn.disabled = filters.page >= totalPages;
    nextBtn.addEventListener('click', () => {
      filters.page++;
      renderProblemList(container, problems, progress);
    });

    pagination.appendChild(prevBtn);
    pagination.appendChild(pageInfo);
    pagination.appendChild(nextBtn);
    page.appendChild(pagination);
  }

  if (filtered.length === 0) {
    const empty = createElement('div', 'empty-state', '<p>No problems match your filters</p>');
    page.appendChild(empty);
  }

  container.appendChild(page);

  // Search handler
  searchInput.addEventListener('input', debounce(() => {
    filters.search = searchInput.value;
    filters.page = 1;
    renderProblemList(container, problems, progress);
  }, 200));
}
