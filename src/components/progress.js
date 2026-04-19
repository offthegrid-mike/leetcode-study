import { createElement, escapeHtml, getCategoryColor, formatDate, timeAgo } from '../utils/helpers.js';
import { getAllProgress, getStats, getStudySessions } from '../lib/storage.js';
import { getReviewStats } from '../lib/spaced-rep.js';

const CATEGORIES = [
  'Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack',
  'Binary Search', 'Linked List', 'Trees', 'Tries', 'Heap / Priority Queue',
  'Backtracking', 'Graphs', 'Dynamic Programming', '2-D Dynamic Programming',
  'Greedy', 'Intervals', 'Math & Bit Manipulation', 'Advanced Graphs'
];

const ACHIEVEMENTS = [
  { id: 'first-steps',     icon: '🏆', name: 'First Steps',     desc: 'Attempted first problem',           test: (s) => s.totalAttempted >= 1 },
  { id: 'bookworm',        icon: '📚', name: 'Bookworm',        desc: 'Attempted 10 problems',             test: (s) => s.totalAttempted >= 10 },
  { id: 'rising-star',     icon: '⭐', name: 'Rising Star',     desc: 'Mastered 10 problems',              test: (s) => s.mastered >= 10 },
  { id: 'on-fire',         icon: '🔥', name: 'On Fire',         desc: '7+ day streak',                     test: (s) => s.streak >= 7 },
  { id: 'centurion',       icon: '💯', name: 'Centurion',       desc: '100+ total reviews',                test: (s) => s.totalReviews >= 100 },
  { id: 'category-pro',    icon: '🎯', name: 'Category Pro',    desc: 'Mastered all in a category',        test: (s) => s.anyCategoryFullyMastered },
  { id: 'neetcode-master', icon: '👑', name: 'NeetCode Master', desc: 'Mastered all 150 problems',         test: (s) => s.mastered >= 150 },
];

function computeReviewBreakdown(allProgress) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  let overdue = 0;
  let dueToday = 0;
  let dueTomorrow = 0;

  for (const p of allProgress) {
    if (!p.nextReview || p.repetitions === 0 || p.repetitions === undefined) continue;
    const rd = new Date(p.nextReview);
    rd.setHours(0, 0, 0, 0);
    if (rd < todayStart) { overdue++; }
    else if (rd <= todayEnd) { dueToday++; }
    else if (rd <= tomorrowEnd) { dueTomorrow++; }
  }

  return { overdue, dueToday, dueTomorrow };
}

function getDailyChallenge(problems, progress) {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  // Simple seeded shuffle to pick 3 deterministic problems
  const seededRandom = (s) => {
    let x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  const indices = [];
  let s = seed;
  while (indices.length < 3 && indices.length < problems.length) {
    s = s * 1.1 + 7;
    const idx = Math.floor(seededRandom(s) * problems.length);
    if (!indices.includes(idx)) indices.push(idx);
  }
  return indices.map(i => {
    const p = problems[i];
    const prog = progress[p.id];
    const viewed = prog && prog.lastReviewed &&
      new Date(prog.lastReviewed).toDateString() === today.toDateString();
    return { ...p, viewedToday: viewed };
  });
}

function computeAchievementStats(stats, problems, progress) {
  const totalAttempted = (stats.attempted || 0) + (stats.reviewing || 0) + (stats.mastered || 0);

  let anyCategoryFullyMastered = false;
  for (const cat of CATEGORIES) {
    const catProblems = problems.filter(p => p.category === cat);
    if (catProblems.length === 0) continue;
    const allMastered = catProblems.every(p => {
      const prog = progress[p.id];
      return prog && prog.status === 'mastered';
    });
    if (allMastered) { anyCategoryFullyMastered = true; break; }
  }

  return {
    totalAttempted,
    mastered: stats.mastered || 0,
    streak: stats.streak || 0,
    totalReviews: stats.totalReviews || 0,
    anyCategoryFullyMastered,
  };
}

export async function renderDashboard(container, problems, progress) {
  container.innerHTML = '';
  const page = createElement('div', 'page-dashboard');

  const stats = await getStats();
  const allProgress = await getAllProgress();
  const reviewStats = getReviewStats(allProgress);
  const reviewBreakdown = computeReviewBreakdown(allProgress);

  // Overall progress ring
  const total = problems.length || 150;
  const mastered = stats.mastered || 0;
  const reviewing = stats.reviewing || 0;
  const attempted = stats.attempted || 0;
  const done = mastered + reviewing;
  const pct = Math.round((done / total) * 100);

  const dueTotalDisplay = reviewBreakdown.overdue + reviewBreakdown.dueToday;

  const overviewSection = createElement('div', 'dashboard-grid');
  overviewSection.innerHTML = `
    <div class="stat-card stat-card-large">
      <div class="progress-ring-container" role="img" aria-label="${pct}% overall progress — ${done} of ${total} problems completed">
        <svg viewBox="0 0 100 100" class="progress-ring" aria-hidden="true">
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
      <span class="stat-num">${dueTotalDisplay}</span>
      <span class="stat-label">Due Today</span>
      <div class="stat-breakdown">
        ${reviewBreakdown.overdue > 0 ? `<span class="stat-breakdown-item stat-breakdown-overdue">⚠️ ${reviewBreakdown.overdue} overdue</span>` : ''}
        <span class="stat-breakdown-item">${reviewBreakdown.dueToday} today</span>
        <span class="stat-breakdown-item">${reviewBreakdown.dueTomorrow} tomorrow</span>
      </div>
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

  // Category progress (enhanced with mastered/reviewing/attempted segments)
  const categorySection = createElement('div', 'problem-section');
  categorySection.innerHTML = `<h3 class="section-title">📂 Progress by Category</h3>`;

  const legendDiv = createElement('div', 'category-legend');
  legendDiv.innerHTML = `
    <span class="legend-item"><span class="legend-dot" style="background:#22c55e"></span>Mastered</span>
    <span class="legend-item"><span class="legend-dot" style="background:#f59e0b"></span>Reviewing</span>
    <span class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span>Attempted</span>
  `;
  categorySection.appendChild(legendDiv);

  const categoryDiv = createElement('div', 'category-progress-list');
  CATEGORIES.forEach(cat => {
    const catProblems = problems.filter(p => p.category === cat);
    if (catProblems.length === 0) return;

    let catMastered = 0, catReviewing = 0, catAttempted = 0;
    catProblems.forEach(p => {
      const prog = progress[p.id];
      if (!prog) return;
      if (prog.status === 'mastered') catMastered++;
      else if (prog.status === 'reviewing') catReviewing++;
      else if (prog.status === 'attempted') catAttempted++;
    });
    const catDone = catMastered + catReviewing;
    const catTotal = catProblems.length;

    const item = createElement('div', 'category-progress');
    item.innerHTML = `
      <div class="category-progress-header">
        <span class="category-name" style="color:${getCategoryColor(cat)}">${cat}</span>
        <span class="category-count">${catDone}/${catTotal}</span>
      </div>
      <div class="category-bar">
        <div class="category-bar-segment" style="width:${(catMastered/catTotal)*100}%;background:#22c55e" title="Mastered: ${catMastered}"></div>
        <div class="category-bar-segment" style="width:${(catReviewing/catTotal)*100}%;background:#f59e0b" title="Reviewing: ${catReviewing}"></div>
        <div class="category-bar-segment" style="width:${(catAttempted/catTotal)*100}%;background:#3b82f6" title="Attempted: ${catAttempted}"></div>
      </div>
    `;
    categoryDiv.appendChild(item);
  });
  categorySection.appendChild(categoryDiv);
  page.appendChild(categorySection);

  // Daily Challenge
  const dailyChallenge = getDailyChallenge(problems, progress);
  const challengeSection = createElement('div', 'problem-section');
  challengeSection.innerHTML = `<h3 class="section-title">📌 Today's Challenge</h3>`;
  const challengeGrid = createElement('div', 'daily-challenge-grid');
  dailyChallenge.forEach(p => {
    const card = createElement('div', `daily-challenge-card${p.viewedToday ? ' viewed' : ''}`);
    card.innerHTML = `
      <a href="#/problems/${p.id}" class="daily-challenge-link">
        <span class="daily-challenge-title">${escapeHtml(p.title)}</span>
        <span class="daily-challenge-meta" style="color:${getCategoryColor(p.category)}">${p.category}</span>
        <span class="daily-challenge-diff diff-${p.difficulty.toLowerCase()}">${p.difficulty}</span>
      </a>
      ${p.viewedToday ? '<span class="daily-challenge-check">✅</span>' : ''}
    `;
    challengeGrid.appendChild(card);
  });
  challengeSection.appendChild(challengeGrid);
  page.appendChild(challengeSection);

  // Achievements
  const achieveStats = computeAchievementStats(stats, problems, progress);
  const achieveSection = createElement('div', 'problem-section');
  achieveSection.innerHTML = `<h3 class="section-title">🏅 Achievements</h3>`;
  const badgeGrid = createElement('div', 'badge-grid');
  ACHIEVEMENTS.forEach(a => {
    const earned = a.test(achieveStats);
    const badge = createElement('div', `badge${earned ? ' badge-earned' : ' badge-locked'}`);
    badge.innerHTML = `
      <span class="badge-icon">${earned ? a.icon : '🔒'}</span>
      <span class="badge-name">${a.name}</span>
      <span class="badge-desc">${a.desc}</span>
    `;
    badge.title = a.desc;
    badgeGrid.appendChild(badge);
  });
  achieveSection.appendChild(badgeGrid);
  page.appendChild(achieveSection);

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
