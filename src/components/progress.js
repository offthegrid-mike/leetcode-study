import { createElement, escapeHtml, getCategoryColor, formatDate, timeAgo } from '../utils/helpers.js';
import { getAllProgress, getStats, getStudySessions } from '../lib/storage.js';
import { getReviewStats } from '../lib/spaced-rep.js';

const CATEGORIES = [
  'Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack',
  'Binary Search', 'Linked List', 'Trees', 'Tries', 'Heap / Priority Queue',
  'Backtracking', 'Graphs', 'Dynamic Programming', '2-D Dynamic Programming',
  'Greedy', 'Intervals', 'Math & Bit Manipulation', 'Advanced Graphs'
];

export async function renderDashboard(container, problems, progress) {
  container.innerHTML = '';
  const page = createElement('div', 'page-dashboard');

  const stats = await getStats();
  const allProgress = await getAllProgress();
  const reviewStats = getReviewStats(allProgress);

  // Overall progress ring
  const total = problems.length || 150;
  const mastered = stats.mastered || 0;
  const reviewing = stats.reviewing || 0;
  const attempted = stats.attempted || 0;
  const done = mastered + reviewing;
  const pct = Math.round((done / total) * 100);

  const overviewSection = createElement('div', 'dashboard-grid');
  overviewSection.innerHTML = `
    <div class="stat-card stat-card-large">
      <div class="progress-ring-container">
        <svg viewBox="0 0 100 100" class="progress-ring">
          <circle cx="50" cy="50" r="45" class="progress-ring-bg"/>
          <circle cx="50" cy="50" r="45" class="progress-ring-fill" 
            style="stroke-dasharray: ${pct * 2.83} ${283 - pct * 2.83}"/>
        </svg>
        <div class="progress-ring-text">
          <span class="progress-pct">${pct}%</span>
          <span class="progress-label">${done}/${total}</span>
        </div>
      </div>
      <p class="stat-label">Overall Progress</p>
    </div>
    <div class="stat-card">
      <span class="stat-num">${reviewStats.dueToday}</span>
      <span class="stat-label">Due Today</span>
    </div>
    <div class="stat-card">
      <span class="stat-num">🔥 ${stats.streak || 0}</span>
      <span class="stat-label">Day Streak</span>
    </div>
    <div class="stat-card">
      <span class="stat-num">${stats.totalReviews || 0}</span>
      <span class="stat-label">Total Reviews</span>
    </div>
  `;
  page.appendChild(overviewSection);

  // Status breakdown
  const breakdownSection = createElement('div', 'problem-section');
  breakdownSection.innerHTML = `
    <h3 class="section-title">📊 Status Breakdown</h3>
    <div class="status-breakdown">
      <div class="status-bar">
        <div class="status-segment status-mastered" style="width:${(mastered/total)*100}%" title="Mastered: ${mastered}"></div>
        <div class="status-segment status-reviewing" style="width:${(reviewing/total)*100}%" title="Reviewing: ${reviewing}"></div>
        <div class="status-segment status-attempted" style="width:${(attempted/total)*100}%" title="Attempted: ${attempted}"></div>
      </div>
      <div class="status-legend">
        <span class="legend-item"><span class="legend-dot" style="background:#22c55e"></span>Mastered (${mastered})</span>
        <span class="legend-item"><span class="legend-dot" style="background:#f59e0b"></span>Reviewing (${reviewing})</span>
        <span class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span>Attempted (${attempted})</span>
        <span class="legend-item"><span class="legend-dot" style="background:#374151"></span>Not Started (${total - mastered - reviewing - attempted})</span>
      </div>
    </div>
  `;
  page.appendChild(breakdownSection);

  // Category progress
  const categorySection = createElement('div', 'problem-section');
  categorySection.innerHTML = `<h3 class="section-title">📂 Progress by Category</h3>`;

  const categoryDiv = createElement('div', 'category-progress-list');
  CATEGORIES.forEach(cat => {
    const catProblems = problems.filter(p => p.category === cat);
    if (catProblems.length === 0) return;

    const catDone = catProblems.filter(p => {
      const prog = progress[p.id];
      return prog && (prog.status === 'mastered' || prog.status === 'reviewing');
    }).length;
    const catPct = Math.round((catDone / catProblems.length) * 100);

    const item = createElement('div', 'category-progress');
    item.innerHTML = `
      <div class="category-progress-header">
        <span class="category-name" style="color:${getCategoryColor(cat)}">${cat}</span>
        <span class="category-count">${catDone}/${catProblems.length}</span>
      </div>
      <div class="category-bar"><div class="category-bar-fill" style="width:${catPct}%;background:${getCategoryColor(cat)}"></div></div>
    `;
    categoryDiv.appendChild(item);
  });
  categorySection.appendChild(categoryDiv);
  page.appendChild(categorySection);

  // Quick actions
  const actionsSection = createElement('div', 'problem-section');
  actionsSection.innerHTML = `
    <h3 class="section-title">⚡ Quick Actions</h3>
    <div class="quick-actions">
      <button class="btn btn-primary" onclick="window.location.hash='#/review'">🔄 Start Review${reviewStats.dueToday > 0 ? ` (${reviewStats.dueToday})` : ''}</button>
      <button class="btn btn-secondary" onclick="window.location.hash='#/quiz'">🧠 Take Quiz</button>
      <button class="btn btn-ghost" id="randomProblem">🎲 Random Problem</button>
    </div>
  `;
  page.appendChild(actionsSection);

  // Recent activity
  const recentSection = createElement('div', 'problem-section');
  recentSection.innerHTML = `<h3 class="section-title">🕐 Recent Activity</h3>`;
  const recentProblems = allProgress
    .filter(p => p.lastReviewed)
    .sort((a, b) => new Date(b.lastReviewed) - new Date(a.lastReviewed))
    .slice(0, 10);

  if (recentProblems.length > 0) {
    const recentList = createElement('div', 'recent-list');
    recentProblems.forEach(prog => {
      const problem = problems.find(p => p.id === prog.id);
      if (!problem) return;
      const item = createElement('div', 'recent-item');
      item.innerHTML = `
        <a href="#/problems/${problem.id}" class="recent-link">${escapeHtml(problem.title)}</a>
        <span class="recent-time">${timeAgo(prog.lastReviewed)}</span>
      `;
      recentList.appendChild(item);
    });
    recentSection.appendChild(recentList);
  } else {
    recentSection.innerHTML += '<p class="empty-detail">No activity yet. Start studying!</p>';
  }
  page.appendChild(recentSection);

  container.appendChild(page);

  // Random problem handler
  document.getElementById('randomProblem')?.addEventListener('click', () => {
    const idx = Math.floor(Math.random() * problems.length);
    if (problems[idx]) window.location.hash = `#/problems/${problems[idx].id}`;
  });
}
