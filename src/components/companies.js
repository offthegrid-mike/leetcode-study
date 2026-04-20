import { createElement, getDifficultyColor, escapeHtml } from '../utils/helpers.js';

const PERIODS = [
  { key: 'all',           label: 'All Time',     file: 'all.csv' },
  { key: 'six-months',    label: '6 Months',     file: 'six-months.csv' },
  { key: 'three-months',  label: '3 Months',     file: 'three-months.csv' },
  { key: 'thirty-days',   label: '30 Days',      file: 'thirty-days.csv' },
];

const BASE_URL = 'https://raw.githubusercontent.com/snehasishroy/leetcode-companywise-interview-questions/master/';

// sessionStorage cache key
function cacheKey(company, period) {
  return `lc_companies_${company}_${period}`;
}

async function fetchCSV(company, period) {
  const key = cacheKey(company, period);
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const url = `${BASE_URL}${company}/${period}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);
  sessionStorage.setItem(key, JSON.stringify(rows));
  return rows;
}

function parseCSV(text) {
  const lines = text.trim().split('\n').slice(1); // skip header
  return lines.map(line => {
    const firstComma = line.indexOf(',');
    const id = parseInt(line.slice(0, firstComma));
    const rest = line.slice(firstComma + 1);
    const secondComma = rest.indexOf(',');
    const url = rest.slice(0, secondComma);
    const afterUrl = rest.slice(secondComma + 1);
    const parts = afterUrl.split(',');
    const frequency = parseFloat(parts[parts.length - 1]);
    const acceptance = parts[parts.length - 2];
    const difficulty = parts[parts.length - 3];
    const title = parts.slice(0, parts.length - 3).join(',').replace(/^"|"$/g, '').trim();
    return { id, url, title, difficulty, acceptance, frequency };
  }).filter(r => !isNaN(r.id) && r.id > 0)
    .sort((a, b) => b.frequency - a.frequency);
}

export async function renderCompanies(container, problems, progress) {
  container.innerHTML = '';

  // Build slug->problem lookup
  const bySlug = new Map();
  const byTitle = new Map();
  for (const p of problems) {
    if (p.leetcode_url) {
      const slug = p.leetcode_url.replace(/.*\/problems\//, '').replace(/\/$/, '');
      bySlug.set(slug, p);
    }
    byTitle.set(p.title.toLowerCase().trim(), p);
  }

  const page = createElement('div', 'page-companies');

  // Header
  const header = createElement('div', 'companies-header');
  header.innerHTML = `
    <div class="ms-header-brand">
      <span class="ms-logo">🪟</span>
      <div>
        <h2>Microsoft Interview Problems</h2>
        <p class="companies-subtitle">Top LeetCode problems asked at Microsoft, sorted by interview frequency.</p>
      </div>
    </div>
  `;
  page.appendChild(header);

  // Period tabs
  const periodTabs = createElement('div', 'period-tabs');
  PERIODS.forEach(p => {
    const tab = createElement('button', 'period-tab');
    tab.dataset.key = p.key;
    tab.dataset.file = p.file;
    tab.textContent = p.label;
    periodTabs.appendChild(tab);
  });
  page.appendChild(periodTabs);

  // Results area
  const resultsArea = createElement('div', 'companies-results');
  page.appendChild(resultsArea);

  container.appendChild(page);

  // State
  let currentPeriod = PERIODS[0];

  function setActivePeriod(key) {
    currentPeriod = PERIODS.find(p => p.key === key);
    periodTabs.querySelectorAll('.period-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.key === key);
    });
    loadTable();
  }

  periodTabs.addEventListener('click', e => {
    const tab = e.target.closest('.period-tab');
    if (tab) setActivePeriod(tab.dataset.key);
  });

  async function loadTable() {
    resultsArea.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading Microsoft problems…</p></div>`;
    try {
      const rows = await fetchCSV('microsoft', currentPeriod.file);
      renderTable(rows);
    } catch (err) {
      resultsArea.innerHTML = `
        <div class="empty-state">
          <p>⚠️ Could not load data — check your internet connection.</p>
          <p class="muted">${escapeHtml(err.message)}</p>
        </div>`;
    }
  }

  function renderTable(rows) {
    const inBank = rows.filter(r => {
      const slug = r.url.replace(/.*\/problems\//, '').replace(/\/$/, '');
      return bySlug.has(slug) || byTitle.has(r.title.toLowerCase().trim());
    }).length;

    const mockBtn = document.createElement('button');
    mockBtn.className = 'btn btn-primary mock-company-btn';
    mockBtn.textContent = '🎯 Mock Interview (Top 10 from Bank)';

    const summaryDiv = createElement('div', 'companies-summary');
    summaryDiv.innerHTML = `
      <span class="bank-count">${inBank} of ${rows.length} in Study Bank</span>
    `;
    summaryDiv.appendChild(mockBtn);

    const table = document.createElement('table');
    table.className = 'companies-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>LeetCode ID</th>
          <th>Title</th>
          <th>Difficulty</th>
          <th>Acceptance</th>
          <th>Frequency</th>
          <th>Status</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement('tbody');

    rows.forEach((row, idx) => {
      const slug = row.url.replace(/.*\/problems\//, '').replace(/\/$/, '');
      const bankProblem = bySlug.get(slug) || byTitle.get(row.title.toLowerCase().trim());
      const prog = bankProblem ? progress[bankProblem.id] : null;
      const status = prog?.ease ? '✅' : prog ? '👁' : '—';
      const statusClass = prog?.ease ? 'status-mastered' : prog ? 'status-seen' : 'status-new';

      const tr = document.createElement('tr');
      tr.className = bankProblem ? 'in-bank' : '';
      const freqBar = Math.round((row.frequency / rows[0].frequency) * 100);

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td class="lc-id">${row.id}</td>
        <td class="problem-title-cell">
          ${bankProblem
            ? `<a href="#/problems/${bankProblem.id}" class="problem-link">${escapeHtml(row.title)}</a>
               <span class="in-bank-badge">📚 In Bank</span>`
            : `<a href="${escapeHtml(row.url)}" target="_blank" rel="noopener" class="external-link">${escapeHtml(row.title)} ↗</a>`
          }
        </td>
        <td><span class="difficulty-badge difficulty-${row.difficulty.toLowerCase()}">${escapeHtml(row.difficulty)}</span></td>
        <td>${escapeHtml(row.acceptance)}</td>
        <td>
          <div class="freq-cell">
            <span>${row.frequency.toFixed(1)}%</span>
            <div class="freq-bar"><div class="freq-fill" style="width:${freqBar}%"></div></div>
          </div>
        </td>
        <td><span class="${statusClass}">${status}</span></td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    resultsArea.innerHTML = '';
    resultsArea.appendChild(summaryDiv);
    resultsArea.appendChild(table);

    // Mock interview button
    mockBtn.addEventListener('click', () => {
      const bankProbs = rows
        .map(r => {
          const s = r.url.replace(/.*\/problems\//, '').replace(/\/$/, '');
          return bySlug.get(s) || byTitle.get(r.title.toLowerCase().trim());
        })
        .filter(Boolean)
        .slice(0, 10);

      if (bankProbs.length === 0) {
        alert('No bank problems found for this company/period.');
        return;
      }
      // Store selected IDs for mock interview
      sessionStorage.setItem('mockInterviewIds', JSON.stringify(bankProbs.map(p => p.id)));
      window.location.hash = '#/mock-interview';
    });
  }

  // Initialize
  setActivePeriod(PERIODS[0].key);
}
