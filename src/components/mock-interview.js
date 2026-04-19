import { createElement, escapeHtml, getDifficultyColor, getCategoryColor, shuffleArray, showToast } from '../utils/helpers.js';
import { setProgress, getProgress, addStudySession } from '../lib/storage.js';

/**
 * Render the Mock Interview mode.
 * @param {HTMLElement} container
 * @param {object[]} problems
 * @param {object} progress
 */
export async function renderMockInterview(container, problems, progress) {
  container.innerHTML = '';

  if (!problems || problems.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No problems loaded.</p></div>';
    return;
  }

  renderSetupScreen(container, problems, progress);
}

// ── Setup Screen ──────────────────────────────────────────────────────

function renderSetupScreen(container, problems, progress) {
  container.innerHTML = '';
  const page = createElement('div', 'page-mock-interview');

  page.innerHTML = `
    <h2 class="page-title">🎯 Mock Interview</h2>
    <p class="page-subtitle">Simulate a timed coding interview. Solutions are hidden — just like the real thing.</p>

    <div class="mock-setup-card">
      <h3 class="section-title">Configure Your Session</h3>

      <div class="mock-setup-field">
        <label class="mock-setup-label">Difficulty</label>
        <div class="mock-difficulty-checks">
          <label class="mock-checkbox-label">
            <input type="checkbox" value="Easy" checked class="mock-diff-cb"> 
            <span class="difficulty-badge" style="background:#22c55e">Easy</span>
          </label>
          <label class="mock-checkbox-label">
            <input type="checkbox" value="Medium" checked class="mock-diff-cb">
            <span class="difficulty-badge" style="background:#f59e0b">Medium</span>
          </label>
          <label class="mock-checkbox-label">
            <input type="checkbox" value="Hard" checked class="mock-diff-cb">
            <span class="difficulty-badge" style="background:#ef4444">Hard</span>
          </label>
        </div>
      </div>

      <div class="mock-setup-row">
        <div class="mock-setup-field">
          <label class="mock-setup-label" for="mockNumProblems">Number of Problems</label>
          <select id="mockNumProblems" class="mock-select">
            <option value="1">1 problem</option>
            <option value="2">2 problems</option>
            <option value="3" selected>3 problems</option>
            <option value="5">5 problems</option>
          </select>
        </div>
        <div class="mock-setup-field">
          <label class="mock-setup-label" for="mockTimeLimit">Time Limit</label>
          <select id="mockTimeLimit" class="mock-select">
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45" selected>45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </div>
      </div>

      <button class="btn btn-primary mock-start-btn" id="mockStartBtn">Start Interview</button>
    </div>
  `;

  container.appendChild(page);

  document.getElementById('mockStartBtn').addEventListener('click', () => {
    const checked = [...document.querySelectorAll('.mock-diff-cb:checked')].map(cb => cb.value);
    if (checked.length === 0) {
      showToast('Select at least one difficulty', 'error');
      return;
    }

    const numProblems = parseInt(document.getElementById('mockNumProblems').value);
    const timeLimit = parseInt(document.getElementById('mockTimeLimit').value);

    const eligible = problems.filter(p => checked.includes(p.difficulty));
    if (eligible.length === 0) {
      showToast('No problems match the selected difficulty', 'error');
      return;
    }

    const selected = shuffleArray(eligible).slice(0, Math.min(numProblems, eligible.length));
    startInterview(container, selected, timeLimit, progress);
  });
}

// ── Interview Screen ──────────────────────────────────────────────────

function startInterview(container, selectedProblems, timeLimitMinutes, progress) {
  const totalSeconds = timeLimitMinutes * 60;
  const startTime = Date.now();
  let currentIndex = 0;
  let timerInterval = null;
  let ended = false;
  const notes = {};

  function getRemainingSeconds() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function endInterview() {
    if (ended) return;
    ended = true;
    clearInterval(timerInterval);
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    showResults(container, selectedProblems, notes, elapsedSeconds, progress);
  }

  function renderProblem() {
    if (!container.isConnected) { clearInterval(timerInterval); return; }
    container.innerHTML = '';

    const problem = selectedProblems[currentIndex];
    const remaining = getRemainingSeconds();
    const isWarning = remaining <= 300;
    const isLast = currentIndex === selectedProblems.length - 1;

    const page = createElement('div', 'page-mock-interview');

    // Top bar
    const topBar = createElement('div', 'mock-top-bar');
    topBar.innerHTML = `
      <div class="mock-timer ${isWarning ? 'mock-timer-warning' : ''}" id="mockTimer">
        ${formatTime(remaining)}
      </div>
      <div class="mock-problem-counter">Problem ${currentIndex + 1}/${selectedProblems.length}</div>
      <button class="btn btn-danger mock-end-btn" id="mockEndBtn">End Early</button>
    `;
    page.appendChild(topBar);

    // Problem content
    const content = createElement('div', 'mock-problem-content');

    // Header
    const header = createElement('div', 'mock-problem-header');
    header.innerHTML = `
      <div class="problem-title-row">
        <h2 class="problem-title">${escapeHtml(problem.title)}</h2>
        <span class="difficulty-badge" style="background:${getDifficultyColor(problem.difficulty)}">${problem.difficulty}</span>
      </div>
      <div class="problem-meta">
        <span class="problem-category-tag" style="border-color:${getCategoryColor(problem.category)};color:${getCategoryColor(problem.category)}">${problem.category}</span>
        ${problem.patterns.map(p => `<span class="pattern-tag">${escapeHtml(p)}</span>`).join('')}
      </div>
      <a href="${problem.leetcode_url}" target="_blank" rel="noopener" class="leetcode-link">Open on LeetCode ↗</a>
    `;
    content.appendChild(header);

    // Approach
    if (problem.approach) {
      const approachSection = createElement('div', 'problem-section');
      approachSection.innerHTML = `
        <h3 class="section-title">Approach</h3>
        <p>${escapeHtml(problem.approach)}</p>
      `;
      content.appendChild(approachSection);
    }

    // Hints (collapsible)
    if (problem.hints && problem.hints.length > 0) {
      const hintsSection = createElement('div', 'problem-section mock-hints-section');
      hintsSection.innerHTML = `<h3 class="section-title">Hints</h3>`;
      problem.hints.forEach((hint, i) => {
        const hintWrapper = createElement('div', 'mock-hint-wrapper');
        const hintBtn = createElement('button', 'btn btn-secondary mock-hint-btn');
        hintBtn.textContent = `Reveal Hint ${i + 1}`;
        const hintText = createElement('p', 'mock-hint-text mock-hint-hidden');
        hintText.textContent = hint;
        hintBtn.addEventListener('click', () => {
          hintText.classList.remove('mock-hint-hidden');
          hintBtn.style.display = 'none';
        });
        hintWrapper.appendChild(hintBtn);
        hintWrapper.appendChild(hintText);
        hintsSection.appendChild(hintWrapper);
      });
      content.appendChild(hintsSection);
    }

    // Notes textarea
    const notesSection = createElement('div', 'problem-section mock-notes-section');
    notesSection.innerHTML = `
      <h3 class="section-title">Your Notes</h3>
      <textarea class="mock-notes-textarea" id="mockNotes" placeholder="Write your approach, pseudocode, or observations here…">${escapeHtml(notes[problem.id] || '')}</textarea>
    `;
    content.appendChild(notesSection);

    page.appendChild(content);

    // Navigation
    const navBar = createElement('div', 'mock-nav-bar');
    const nextBtn = createElement('button', 'btn btn-primary mock-next-btn');
    nextBtn.textContent = isLast ? 'Finish Interview' : 'Next Problem →';
    nextBtn.addEventListener('click', () => {
      saveNotes(problem.id);
      if (isLast) {
        endInterview();
      } else {
        currentIndex++;
        renderProblem();
      }
    });
    navBar.appendChild(nextBtn);
    page.appendChild(navBar);

    container.appendChild(page);

    document.getElementById('mockEndBtn').addEventListener('click', () => {
      saveNotes(problem.id);
      endInterview();
    });
  }

  function saveNotes(problemId) {
    const textarea = document.getElementById('mockNotes');
    if (textarea) {
      notes[problemId] = textarea.value;
    }
  }

  function tick() {
    if (!container.isConnected) { clearInterval(timerInterval); return; }
    const remaining = getRemainingSeconds();
    const timerEl = document.getElementById('mockTimer');
    if (timerEl) {
      timerEl.textContent = formatTime(remaining);
      timerEl.classList.toggle('mock-timer-warning', remaining <= 300);
    }
    if (remaining <= 0) {
      endInterview();
      showToast('⏰ Time\'s up!', 'error', 4000);
    }
  }

  timerInterval = setInterval(tick, 1000);
  renderProblem();
}

// ── Results Screen ────────────────────────────────────────────────────

async function showResults(container, selectedProblems, notes, elapsedSeconds, progress) {
  container.innerHTML = '';
  const page = createElement('div', 'page-mock-interview');

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  const diffBreakdown = { Easy: 0, Medium: 0, Hard: 0 };
  selectedProblems.forEach(p => { diffBreakdown[p.difficulty]++; });

  page.innerHTML = `
    <h2 class="page-title">🎯 Interview Complete</h2>

    <div class="mock-results-summary">
      <div class="mock-result-stat">
        <span class="mock-result-value">${minutes}m ${seconds}s</span>
        <span class="mock-result-label">Total Time</span>
      </div>
      <div class="mock-result-stat">
        <span class="mock-result-value">${selectedProblems.length}</span>
        <span class="mock-result-label">Problems Attempted</span>
      </div>
      <div class="mock-result-stat">
        <span class="mock-result-value">
          ${diffBreakdown.Easy ? `<span style="color:#22c55e">${diffBreakdown.Easy}E</span> ` : ''}${diffBreakdown.Medium ? `<span style="color:#f59e0b">${diffBreakdown.Medium}M</span> ` : ''}${diffBreakdown.Hard ? `<span style="color:#ef4444">${diffBreakdown.Hard}H</span>` : ''}
        </span>
        <span class="mock-result-label">Difficulty Mix</span>
      </div>
    </div>
  `;

  // Problem list
  const listSection = createElement('div', 'mock-results-list');
  listSection.innerHTML = `<h3 class="section-title">Problems Reviewed</h3>`;

  selectedProblems.forEach(problem => {
    const card = createElement('div', 'mock-result-card');
    card.innerHTML = `
      <div class="mock-result-card-header">
        <a href="#/problems/${problem.id}" class="mock-result-problem-link">${escapeHtml(problem.title)}</a>
        <span class="difficulty-badge" style="background:${getDifficultyColor(problem.difficulty)}">${problem.difficulty}</span>
      </div>
      <span class="problem-category-tag" style="border-color:${getCategoryColor(problem.category)};color:${getCategoryColor(problem.category)}">${problem.category}</span>
      ${notes[problem.id] ? `<p class="mock-result-notes">${escapeHtml(notes[problem.id])}</p>` : ''}
    `;
    listSection.appendChild(card);
  });

  page.appendChild(listSection);

  // Action buttons
  const actions = createElement('div', 'mock-result-actions');
  actions.innerHTML = `
    <button class="btn btn-primary" id="mockReviewBtn">Review Solutions</button>
    <button class="btn btn-secondary" id="mockRestartBtn">New Interview</button>
  `;
  page.appendChild(actions);

  container.appendChild(page);

  // Save notes to progress
  for (const problem of selectedProblems) {
    if (notes[problem.id]) {
      const existing = progress[problem.id] || await getProgress(problem.id) || {};
      await setProgress(problem.id, {
        ...existing,
        id: problem.id,
        notes: notes[problem.id],
      });
    }
  }

  // Record study session
  await addStudySession({
    type: 'mock-interview',
    problemsReviewed: selectedProblems.length,
    duration: elapsedSeconds,
  });

  window.app?.scheduleSync();

  document.getElementById('mockReviewBtn')?.addEventListener('click', () => {
    window.location.hash = `#/problems/${selectedProblems[0].id}`;
  });

  document.getElementById('mockRestartBtn')?.addEventListener('click', () => {
    window.location.hash = '#/mock-interview';
  });
}
