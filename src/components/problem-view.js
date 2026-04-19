import { createElement, escapeHtml, getDifficultyColor, getCategoryColor, showToast } from '../utils/helpers.js';
import { getProgress, setProgress, isBookmarked, toggleBookmark } from '../lib/storage.js';
import { calculateNextReview } from '../lib/spaced-rep.js';

export async function renderProblemView(container, problem, progressData, allProblems) {
  container.innerHTML = '';
  const page = createElement('div', 'page-problem-view');

  // Navigation bar (back + prev/next)
  const navBar = createElement('div', 'problem-nav-bar');
  const backBtn = createElement('button', 'back-btn', '← Back to Problems');
  backBtn.addEventListener('click', () => { window.location.hash = '#/problems'; });
  navBar.appendChild(backBtn);

  const prevNextBar = createElement('div', 'prev-next-bar');
  const currentIndex = allProblems.findIndex(p => p.id === problem.id);

  const prevBtn = createElement('button', 'btn btn-secondary prev-next-btn');
  prevBtn.textContent = '← Prev';
  if (currentIndex > 0) {
    prevBtn.addEventListener('click', () => { window.location.hash = `#/problems/${allProblems[currentIndex - 1].id}`; });
  } else {
    prevBtn.disabled = true;
  }
  prevNextBar.appendChild(prevBtn);

  const posLabel = createElement('span', 'problem-position');
  posLabel.textContent = `${currentIndex + 1} / ${allProblems.length}`;
  prevNextBar.appendChild(posLabel);

  const nextBtn = createElement('button', 'btn btn-secondary prev-next-btn');
  nextBtn.textContent = 'Next →';
  if (currentIndex < allProblems.length - 1) {
    nextBtn.addEventListener('click', () => { window.location.hash = `#/problems/${allProblems[currentIndex + 1].id}`; });
  } else {
    nextBtn.disabled = true;
  }
  prevNextBar.appendChild(nextBtn);
  navBar.appendChild(prevNextBar);
  page.appendChild(navBar);

  // Header
  const header = createElement('div', 'problem-header');
  header.innerHTML = `
    <div class="problem-title-row">
      <h2 class="problem-title">${escapeHtml(problem.title)}</h2>
      <span class="difficulty-badge" style="background:${getDifficultyColor(problem.difficulty)}">${problem.difficulty}</span>
    </div>
    <div class="problem-meta">
      <span class="problem-category-tag" style="border-color:${getCategoryColor(problem.category)};color:${getCategoryColor(problem.category)}">${problem.category}</span>
      ${problem.patterns.map(p => `<span class="pattern-tag">${p}</span>`).join('')}
    </div>
    ${problem.companies && problem.companies.length ? `
    <div class="company-tags">
      ${problem.companies.map(c => {
        const label = c === 'meta' ? 'Meta' : c.charAt(0).toUpperCase() + c.slice(1);
        return `<span class="company-tag" title="Asked by ${label}">🏢 ${label}</span>`;
      }).join('')}
    </div>` : ''}
    <a href="${problem.leetcode_url}" target="_blank" rel="noopener" class="leetcode-link">Open on LeetCode ↗</a>
  `;
  page.appendChild(header);

  // Bookmark button
  const bookmarked = await isBookmarked(problem.id);
  const bookmarkBtn = createElement('button', `btn btn-secondary bookmark-btn${bookmarked ? ' bookmarked' : ''}`);
  bookmarkBtn.textContent = bookmarked ? '★ Bookmarked' : '☆ Bookmark';
  bookmarkBtn.addEventListener('click', async () => {
    const newList = await toggleBookmark(problem.id);
    const nowBookmarked = newList.includes(problem.id);
    bookmarkBtn.textContent = nowBookmarked ? '★ Bookmarked' : '☆ Bookmark';
    bookmarkBtn.classList.toggle('bookmarked', nowBookmarked);
    showToast(nowBookmarked ? 'Bookmarked!' : 'Bookmark removed');
  });
  header.appendChild(bookmarkBtn);

  // Status selector
  const progress = progressData || await getProgress(problem.id) || {};
  const statusSection = createElement('div', 'status-section');
  const statusBtns = ['not_started', 'attempted', 'reviewing', 'mastered'];
  const statusLabels = { not_started: '⬜ Not Started', attempted: '🟡 Attempted', reviewing: '🔄 Reviewing', mastered: '✅ Mastered' };
  statusBtns.forEach(s => {
    const btn = createElement('button', `status-btn${(progress.status || 'not_started') === s ? ' active' : ''}`, statusLabels[s]);
    btn.addEventListener('click', async () => {
      await setProgress(problem.id, { ...progress, id: problem.id, status: s });
      window.app?.scheduleSync();
      showToast(`Status updated to ${statusLabels[s]}`, 'success');
      statusSection.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    statusSection.appendChild(btn);
  });
  page.appendChild(statusSection);

  // Hints (progressive reveal)
  const hintsSection = createElement('div', 'problem-section');
  hintsSection.innerHTML = '<h3 class="section-title">💡 Hints</h3>';
  problem.hints.forEach((hint, i) => {
    const card = createElement('div', 'hint-card');
    const label = createElement('div', 'hint-label', `Hint ${i + 1} — Click to reveal`);
    const content = createElement('div', 'hint-content', escapeHtml(hint));
    content.style.display = 'none';
    label.addEventListener('click', () => {
      const showing = content.style.display !== 'none';
      content.style.display = showing ? 'none' : 'block';
      label.textContent = showing ? `Hint ${i + 1} — Click to reveal` : `Hint ${i + 1}`;
    });
    card.appendChild(label);
    card.appendChild(content);
    hintsSection.appendChild(card);
  });
  page.appendChild(hintsSection);

  // Approach
  const approachSection = createElement('div', 'problem-section');
  approachSection.innerHTML = `
    <h3 class="section-title">🎯 Approach</h3>
    <div class="approach-content">${escapeHtml(problem.approach)}</div>
  `;
  page.appendChild(approachSection);

  // Key Insight
  const insightSection = createElement('div', 'problem-section insight-callout');
  insightSection.innerHTML = `
    <h3 class="section-title">🔑 Key Insight</h3>
    <p class="insight-text">${escapeHtml(problem.key_insight)}</p>
  `;
  page.appendChild(insightSection);

  // Solution with language tabs
  const solutionSection = createElement('div', 'problem-section');
  const solutionHeader = createElement('div', 'section-title-row');
  solutionHeader.innerHTML = `<h3 class="section-title">📝 Solution</h3>`;

  const revealBtn = createElement('button', 'btn btn-primary reveal-btn');
  revealBtn.textContent = '👁️ Reveal Solution';
  solutionHeader.appendChild(revealBtn);
  solutionSection.appendChild(solutionHeader);

  const langTabs = createElement('div', 'lang-tabs');
  const pyTab = createElement('button', 'lang-tab active', 'Python');
  const jsTab = createElement('button', 'lang-tab', 'JavaScript');
  const sideBySideTab = createElement('button', 'lang-tab', 'Side by Side');
  langTabs.appendChild(pyTab);
  langTabs.appendChild(jsTab);
  langTabs.appendChild(sideBySideTab);
  solutionSection.appendChild(langTabs);

  const solutionContainer = createElement('div', 'solution-container');
  let currentView = 'python';

  const showSolution = (lang) => {
    currentView = lang;
    if (lang === 'side-by-side') {
      solutionContainer.innerHTML = `
        <div class="side-by-side-view">
          <div class="side-by-side-pane">
            <div class="side-by-side-label">Python</div>
            <pre class="code-block"><code class="language-python">${escapeHtml(problem.solution_python)}</code></pre>
          </div>
          <div class="side-by-side-pane">
            <div class="side-by-side-label">JavaScript</div>
            <pre class="code-block"><code class="language-javascript">${escapeHtml(problem.solution_js)}</code></pre>
          </div>
        </div>`;
    } else {
      const code = lang === 'python' ? problem.solution_python : problem.solution_js;
      const prismLang = lang === 'python' ? 'python' : 'javascript';
      solutionContainer.innerHTML = `<pre class="code-block"><code class="language-${prismLang}">${escapeHtml(code)}</code></pre>`;
    }
    if (window.Prism) Prism.highlightAllUnder(solutionContainer);
    pyTab.classList.toggle('active', lang === 'python');
    jsTab.classList.toggle('active', lang === 'javascript');
    sideBySideTab.classList.toggle('active', lang === 'side-by-side');
  };

  let revealed = false;
  langTabs.style.display = 'none';
  revealBtn.addEventListener('click', () => {
    revealed = !revealed;
    solutionContainer.style.display = revealed ? 'block' : 'none';
    langTabs.style.display = revealed ? 'flex' : 'none';
    revealBtn.textContent = revealed ? '🙈 Hide Solution' : '👁️ Reveal Solution';
  });

  solutionContainer.style.display = 'none';
  showSolution('python');
  solutionSection.appendChild(solutionContainer);

  pyTab.addEventListener('click', () => showSolution('python'));
  jsTab.addEventListener('click', () => showSolution('javascript'));
  sideBySideTab.addEventListener('click', () => showSolution('side-by-side'));
  page.appendChild(solutionSection);

  // Complexity
  const complexitySection = createElement('div', 'problem-section');
  complexitySection.innerHTML = `
    <h3 class="section-title">⏱️ Complexity</h3>
    <div class="complexity-grid">
      <div class="complexity-item">
        <span class="complexity-label">Time</span>
        <span class="complexity-value">${escapeHtml(problem.time_complexity)}</span>
        ${problem.time_complexity_explanation ? `<span class="complexity-explanation">${escapeHtml(problem.time_complexity_explanation)}</span>` : ''}
      </div>
      <div class="complexity-item">
        <span class="complexity-label">Space</span>
        <span class="complexity-value">${escapeHtml(problem.space_complexity)}</span>
        ${problem.space_complexity_explanation ? `<span class="complexity-explanation">${escapeHtml(problem.space_complexity_explanation)}</span>` : ''}
      </div>
    </div>
  `;
  page.appendChild(complexitySection);

  // Personal Notes
  const notesSection = createElement('div', 'problem-section');
  notesSection.innerHTML = `<h3 class="section-title">📓 My Notes</h3>`;
  const notesArea = createElement('textarea', 'notes-area');
  notesArea.placeholder = 'Write your notes here... (auto-saves)';
  notesArea.value = progress.notes || '';
  notesArea.addEventListener('blur', async () => {
    const current = await getProgress(problem.id) || { id: problem.id };
    await setProgress(problem.id, { ...current, notes: notesArea.value });
    window.app?.scheduleSync();
    showToast('Notes saved', 'info', 1500);
  });
  notesSection.appendChild(notesArea);
  page.appendChild(notesSection);

  // Spaced Repetition Rating
  const ratingSection = createElement('div', 'problem-section rating-section');
  ratingSection.innerHTML = `<h3 class="section-title">📊 Rate Your Understanding</h3>`;
  const ratingBtns = createElement('div', 'rating-buttons');
  const ratings = [
    { label: 'Again', quality: 1, cls: 'rating-again' },
    { label: 'Hard', quality: 2, cls: 'rating-hard' },
    { label: 'Good', quality: 4, cls: 'rating-good' },
    { label: 'Easy', quality: 5, cls: 'rating-easy' },
  ];
  ratings.forEach(({ label, quality, cls }) => {
    const btn = createElement('button', `rating-btn ${cls}`, label);
    btn.addEventListener('click', async () => {
      const current = await getProgress(problem.id) || { id: problem.id, status: 'reviewing' };
      const updated = calculateNextReview(current, quality);
      await setProgress(problem.id, {
        ...current,
        ...updated,
        status: quality >= 4 && (current.repetitions || 0) >= 3 ? 'mastered' : 'reviewing',
        lastReviewed: new Date().toISOString(),
      });
      window.app?.scheduleSync();
      showToast(`Rated "${label}" — next review in ${updated.interval} day${updated.interval !== 1 ? 's' : ''}`, 'success');
      ratingBtns.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    ratingBtns.appendChild(btn);
  });
  ratingSection.appendChild(ratingBtns);
  page.appendChild(ratingSection);

  // Related Problems
  if (problem.related && problem.related.length > 0) {
    const relatedSection = createElement('div', 'problem-section');
    relatedSection.innerHTML = `<h3 class="section-title">🔗 Related Problems</h3>`;
    const relatedList = createElement('div', 'related-list');
    problem.related.forEach(id => {
      const rp = allProblems.find(p => p.id === id);
      if (rp) {
        const link = createElement('a', 'related-link', `#${rp.id} ${escapeHtml(rp.title)}`);
        link.href = `#/problems/${rp.id}`;
        relatedList.appendChild(link);
      }
    });
    relatedSection.appendChild(relatedList);
    page.appendChild(relatedSection);
  }

  container.appendChild(page);
}
