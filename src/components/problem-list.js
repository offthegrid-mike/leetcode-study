import { createElement, getCategoryColor, getDifficultyColor, debounce, escapeHtml } from '../utils/helpers.js';

const CATEGORIES = [
  'All', 'Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack',
  'Binary Search', 'Linked List', 'Trees', 'Tries', 'Heap / Priority Queue',
  'Backtracking', 'Graphs', 'Dynamic Programming', '2-D Dynamic Programming',
  'Greedy', 'Intervals', 'Math & Bit Manipulation', 'Advanced Graphs'
];

let filters = { category: 'All', difficulty: 'All', status: 'All', search: '' };

export function renderProblemList(container, problems, progress) {
  container.innerHTML = '';

  const page = createElement('div', 'page-problems');

  // Search bar
  const searchBar = createElement('div', 'search-bar');
  const searchInput = createElement('input', 'search-input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search problems...';
  searchInput.value = filters.search;
  searchBar.appendChild(searchInput);
  page.appendChild(searchBar);

  // Category filter chips
  const chipBar = createElement('div', 'category-filter');
  CATEGORIES.forEach(cat => {
    const chip = createElement('button', `filter-chip${filters.category === cat ? ' active' : ''}`, cat);
    chip.addEventListener('click', () => {
      filters.category = cat;
      renderProblemList(container, problems, progress);
    });
    chipBar.appendChild(chip);
  });
  page.appendChild(chipBar);

  // Difficulty + Status filters
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
    renderProblemList(container, problems, progress);
  });

  const statusSelect = createElement('select', 'filter-select');
  ['All', 'Not Started', 'Attempted', 'Reviewing', 'Mastered'].forEach(s => {
    const opt = createElement('option', '', s);
    opt.value = s;
    opt.selected = filters.status === s;
    statusSelect.appendChild(opt);
  });
  statusSelect.addEventListener('change', () => {
    filters.status = statusSelect.value;
    renderProblemList(container, problems, progress);
  });

  filterRow.appendChild(diffSelect);
  filterRow.appendChild(statusSelect);
  page.appendChild(filterRow);

  // Filter problems
  const filtered = problems.filter(p => {
    if (filters.category !== 'All' && p.category !== filters.category) return false;
    if (filters.difficulty !== 'All' && p.difficulty !== filters.difficulty) return false;
    if (filters.search && !p.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status !== 'All') {
      const prog = progress[p.id];
      const status = prog?.status || 'not_started';
      const statusMap = { 'Not Started': 'not_started', 'Attempted': 'attempted', 'Reviewing': 'reviewing', 'Mastered': 'mastered' };
      if (status !== statusMap[filters.status]) return false;
    }
    return true;
  });

  // Results count
  const count = createElement('div', 'results-count', `${filtered.length} problem${filtered.length !== 1 ? 's' : ''}`);
  page.appendChild(count);

  // Problem cards grid
  const grid = createElement('div', 'problem-list');
  filtered.forEach(problem => {
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

  if (filtered.length === 0) {
    const empty = createElement('div', 'empty-state', '<p>No problems match your filters</p>');
    page.appendChild(empty);
  }

  container.appendChild(page);

  // Search handler
  searchInput.addEventListener('input', debounce(() => {
    filters.search = searchInput.value;
    renderProblemList(container, problems, progress);
  }, 200));
}
