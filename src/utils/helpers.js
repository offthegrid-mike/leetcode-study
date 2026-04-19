export function createElement(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content) {
    if (typeof content === 'string') el.innerHTML = content;
    else if (content instanceof Node) el.appendChild(content);
  }
  return el;
}

export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeAgo(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const seconds = Math.floor((now - d) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const { label, seconds: s } of intervals) {
    const count = Math.floor(seconds / s);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CATEGORY_COLORS = {
  'Arrays & Hashing': '#3b82f6',
  'Two Pointers': '#8b5cf6',
  'Sliding Window': '#06b6d4',
  'Stack': '#f59e0b',
  'Binary Search': '#10b981',
  'Linked List': '#ec4899',
  'Trees': '#22c55e',
  'Tries': '#14b8a6',
  'Heap / Priority Queue': '#f97316',
  'Backtracking': '#a855f7',
  'Graphs': '#6366f1',
  'Dynamic Programming': '#ef4444',
  '2-D Dynamic Programming': '#dc2626',
  'Greedy': '#84cc16',
  'Intervals': '#0ea5e9',
  'Math & Bit Manipulation': '#64748b',
  'Advanced Graphs': '#7c3aed',
};

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || '#6b7280';
}

export function getDifficultyColor(difficulty) {
  const colors = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };
  return colors[difficulty] || '#6b7280';
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readFileAsJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (e) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function showToast(message, type = 'info', duration = 3000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = createElement('div', `toast toast-${type}`, message);
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function createModal(title, content, onConfirm, onCancel) {
  const modal = createElement('div', 'modal');
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="modal-title">${escapeHtml(title)}</h3>
      <div class="modal-body">${content}</div>
      <div class="modal-actions">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-danger modal-confirm">Confirm</button>
      </div>
    </div>
  `;

  modal.querySelector('.modal-cancel').addEventListener('click', () => {
    modal.remove();
    onCancel?.();
  });
  modal.querySelector('.modal-confirm').addEventListener('click', () => {
    modal.remove();
    onConfirm?.();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) { modal.remove(); onCancel?.(); }
  });

  document.body.appendChild(modal);
  return modal;
}
