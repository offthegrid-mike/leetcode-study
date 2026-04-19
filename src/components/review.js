import { createElement, escapeHtml, showToast } from '../utils/helpers.js';
import { getAllProgress, getProgress, setProgress, addStudySession } from '../lib/storage.js';
import { calculateNextReview, isDue, sortByReviewPriority } from '../lib/spaced-rep.js';

export async function renderReview(container, problems, progress) {
  container.innerHTML = '';
  const page = createElement('div', 'page-review');
  page.innerHTML = `<h2 class="page-title">🔄 Spaced Repetition Review</h2>`;

  // Get due cards
  const allProgress = await getAllProgress();
  const progressMap = {};
  allProgress.forEach(p => progressMap[p.id] = p);

  const dueProblems = problems.filter(p => {
    const prog = progressMap[p.id];
    if (!prog) return false;
    return isDue(prog);
  });

  const newProblems = problems.filter(p => {
    const prog = progressMap[p.id];
    return prog && prog.status === 'attempted' && !prog.lastReviewed;
  });

  // Stats bar
  const stats = createElement('div', 'review-stats');
  stats.innerHTML = `
    <div class="review-stat"><span class="review-stat-num">${dueProblems.length}</span><span class="review-stat-label">Due</span></div>
    <div class="review-stat"><span class="review-stat-num">${newProblems.length}</span><span class="review-stat-label">New</span></div>
    <div class="review-stat"><span class="review-stat-num">${allProgress.filter(p => p.status === 'mastered').length}</span><span class="review-stat-label">Mastered</span></div>
  `;
  page.appendChild(stats);

  const sortedIds = sortByReviewPriority(dueProblems.map(p => p.id), progressMap);
  const reviewQueue = sortedIds.map(id => dueProblems.find(p => p.id === id)).filter(Boolean);

  if (reviewQueue.length === 0) {
    const empty = createElement('div', 'empty-state');
    const nextReview = allProgress
      .filter(p => p.nextReview)
      .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview))[0];

    empty.innerHTML = `
      <p class="empty-icon">🎉</p>
      <p>No cards due for review!</p>
      ${nextReview ? `<p class="empty-detail">Next review: ${new Date(nextReview.nextReview).toLocaleDateString()}</p>` : ''}
      <button class="btn btn-primary" onclick="window.location.hash='#/problems'">Study New Problems</button>
    `;
    page.appendChild(empty);
    container.appendChild(page);
    return;
  }

  const startBtn = createElement('button', 'btn btn-primary btn-large', `Start Review (${reviewQueue.length} cards)`);
  startBtn.addEventListener('click', () => startReviewSession(container, reviewQueue, problems, progressMap));
  page.appendChild(startBtn);
  container.appendChild(page);
}

function startReviewSession(container, queue, allProblems, progressMap) {
  let current = 0;
  let reviewed = 0;
  const sessionStartTime = Date.now();

  function showCard() {
    if (current >= queue.length) {
      const duration = Math.round((Date.now() - sessionStartTime) / 1000);
      addStudySession({ problemsReviewed: reviewed, duration });
      showSessionSummary(container, reviewed, queue, duration);
      return;
    }

    container.innerHTML = '';
    const problem = queue[current];
    const page = createElement('div', 'page-review-active');

    // Progress
    const progressBar = createElement('div', 'quiz-progress');
    progressBar.innerHTML = `
      <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${(current / queue.length) * 100}%"></div></div>
      <span class="quiz-progress-text">${current + 1} / ${queue.length}</span>
    `;
    page.appendChild(progressBar);

    // Flashcard
    const card = createElement('div', 'review-card');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Flashcard — press Enter or click to reveal answer');
    const front = createElement('div', 'review-card-front');
    front.innerHTML = `
      <h3 class="review-problem-title">${escapeHtml(problem.title)}</h3>
      <p class="review-problem-meta">${problem.category} • ${problem.difficulty}</p>
      <div class="review-problem-patterns">${problem.patterns.map(p => `<span class="pattern-tag">${p}</span>`).join('')}</div>
      <p class="review-tap-hint">Tap to reveal answer</p>
    `;

    const back = createElement('div', 'review-card-back');
    back.innerHTML = `
      <h4>Approach</h4>
      <p>${escapeHtml(problem.approach)}</p>
      <h4>Key Insight</h4>
      <p>${escapeHtml(problem.key_insight)}</p>
      <h4>Complexity</h4>
      <p>Time: ${problem.time_complexity} | Space: ${problem.space_complexity}</p>
      <h4>Solution</h4>
      <pre class="code-block"><code class="language-python">${escapeHtml(problem.solution_python)}</code></pre>
    `;
    back.style.display = 'none';

    card.appendChild(front);
    card.appendChild(back);

    const flipCard = () => {
      const isFlipped = card.classList.contains('flipped');
      if (!isFlipped) {
        card.classList.add('flipped');
        front.style.display = 'none';
        back.style.display = 'block';
        ratingSection.style.display = 'flex';
        card.setAttribute('aria-label', 'Answer revealed — rate your recall below');
        if (window.Prism) Prism.highlightAllUnder(back);
      }
    };

    card.addEventListener('click', flipCard);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flipCard();
      }
    });
    page.appendChild(card);

    // Rating buttons
    const ratingSection = createElement('div', 'rating-buttons');
    ratingSection.style.display = 'none';
    const ratings = [
      { label: 'Again', quality: 1, cls: 'rating-again' },
      { label: 'Hard', quality: 2, cls: 'rating-hard' },
      { label: 'Good', quality: 4, cls: 'rating-good' },
      { label: 'Easy', quality: 5, cls: 'rating-easy' },
    ];

    ratings.forEach(({ label, quality, cls }) => {
      const btn = createElement('button', `rating-btn ${cls}`, label);
      btn.addEventListener('click', async () => {
        const prog = progressMap[problem.id] || { id: problem.id };
        const updated = calculateNextReview(prog, quality);
        const newProg = {
          ...prog,
          ...updated,
          status: quality >= 4 && (prog.repetitions || 0) >= 2 ? 'mastered' : 'reviewing',
          lastReviewed: new Date().toISOString(),
        };
        await setProgress(problem.id, newProg);
        window.app?.scheduleSync();
        progressMap[problem.id] = newProg;
        reviewed++;
        current++;
        showCard();
      });
      ratingSection.appendChild(btn);
    });
    page.appendChild(ratingSection);

    // Skip button
    const skipBtn = createElement('button', 'btn btn-ghost', 'Skip →');
    skipBtn.addEventListener('click', () => { current++; showCard(); });
    page.appendChild(skipBtn);

    container.appendChild(page);
  }

  showCard();
}

function showSessionSummary(container, reviewed, queue, duration) {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const durationText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  container.innerHTML = '';
  const page = createElement('div', 'page-review-summary');
  page.innerHTML = `
    <h2 class="page-title">Review Complete! 🎉</h2>
    <div class="summary-card">
      <div class="summary-stat"><span class="summary-num">${reviewed}</span><span class="summary-label">Cards Reviewed</span></div>
      <div class="summary-stat"><span class="summary-num">${durationText}</span><span class="summary-label">Duration</span></div>
    </div>
    <div class="summary-actions">
      <button class="btn btn-primary" onclick="window.location.hash='#/'">Dashboard</button>
      <button class="btn btn-secondary" onclick="window.location.hash='#/problems'">Browse Problems</button>
    </div>
  `;
  container.appendChild(page);
}
