import { createElement, escapeHtml, shuffleArray, showToast, getCategoryColor } from '../utils/helpers.js';
import { getProgress, setProgress } from '../lib/storage.js';

const QUIZ_TYPES = [
  { id: 'pattern', label: '🗂️ Pattern Quiz', desc: 'Identify the pattern from the problem' },
  { id: 'complexity', label: '⏱️ Complexity Quiz', desc: 'Identify time complexity' },
  { id: 'approach', label: '🎯 Approach Quiz', desc: 'Recall the approach' },
];

export function renderQuiz(container, problems, progress) {
  container.innerHTML = '';
  const page = createElement('div', 'page-quiz');
  page.innerHTML = `<h2 class="page-title">🧠 Quiz Mode</h2>`;

  // Quiz type selector
  const typeSelector = createElement('div', 'quiz-type-selector');
  QUIZ_TYPES.forEach(type => {
    const card = createElement('div', 'quiz-type-card');
    card.innerHTML = `<h3>${type.label}</h3><p>${type.desc}</p>`;
    card.addEventListener('click', () => startQuiz(container, problems, progress, type.id));
    typeSelector.appendChild(card);
  });
  page.appendChild(typeSelector);

  // Quick start
  const quickStart = createElement('div', 'quick-start');
  quickStart.innerHTML = `
    <h3>Quick Start</h3>
    <div class="quick-actions">
      <button class="btn btn-primary" id="quiz10">10 Random Questions</button>
      <button class="btn btn-secondary" id="quiz5">5 Questions</button>
    </div>
  `;
  page.appendChild(quickStart);
  container.appendChild(page);

  document.getElementById('quiz10')?.addEventListener('click', () => startQuiz(container, problems, progress, 'pattern', 10));
  document.getElementById('quiz5')?.addEventListener('click', () => startQuiz(container, problems, progress, 'pattern', 5));
}

function startQuiz(container, problems, progress, type, count = 10) {
  if (problems.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No problems loaded</p></div>';
    return;
  }

  const shuffled = shuffleArray(problems).slice(0, Math.min(count, problems.length));
  let current = 0;
  let score = 0;
  const results = [];

  function showQuestion() {
    container.innerHTML = '';
    if (current >= shuffled.length) {
      showResults();
      return;
    }

    const problem = shuffled[current];
    const page = createElement('div', 'page-quiz-active');

    // Progress bar
    const progressBar = createElement('div', 'quiz-progress');
    progressBar.innerHTML = `
      <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${(current / shuffled.length) * 100}%"></div></div>
      <span class="quiz-progress-text">${current + 1} / ${shuffled.length}</span>
    `;
    page.appendChild(progressBar);

    if (type === 'pattern') {
      renderPatternQuestion(page, problem, problems);
    } else if (type === 'complexity') {
      renderComplexityQuestion(page, problem);
    } else {
      renderApproachQuestion(page, problem);
    }

    container.appendChild(page);
  }

  function renderPatternQuestion(page, problem, allProblems) {
    const card = createElement('div', 'quiz-card');
    card.innerHTML = `
      <h3 class="quiz-question">What pattern/technique is best for solving this problem?</h3>
      <div class="quiz-problem-name">${escapeHtml(problem.title)}</div>
      <p class="quiz-problem-category" style="color:${getCategoryColor(problem.category)}">${problem.category} • ${problem.difficulty}</p>
    `;

    const correctAnswer = problem.patterns[0];
    const allPatterns = [...new Set(allProblems.flatMap(p => p.patterns))];
    const wrongAnswers = shuffleArray(allPatterns.filter(p => p !== correctAnswer)).slice(0, 3);
    const options = shuffleArray([correctAnswer, ...wrongAnswers]);

    const optionsDiv = createElement('div', 'quiz-options');
    options.forEach(opt => {
      const btn = createElement('button', 'quiz-option', opt);
      btn.addEventListener('click', () => handleAnswer(optionsDiv, btn, opt, correctAnswer, problem));
      optionsDiv.appendChild(btn);
    });
    card.appendChild(optionsDiv);
    page.appendChild(card);
  }

  function renderComplexityQuestion(page, problem) {
    const card = createElement('div', 'quiz-card');
    card.innerHTML = `
      <h3 class="quiz-question">What is the time complexity of the optimal solution?</h3>
      <div class="quiz-problem-name">${escapeHtml(problem.title)}</div>
      <p class="quiz-hint-text">${escapeHtml(problem.approach)}</p>
    `;

    const correctAnswer = problem.time_complexity;
    const complexities = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'O(2^n)', 'O(n!)'];
    const wrongAnswers = shuffleArray(complexities.filter(c => c !== correctAnswer)).slice(0, 3);
    const options = shuffleArray([correctAnswer, ...wrongAnswers]);

    const optionsDiv = createElement('div', 'quiz-options');
    options.forEach(opt => {
      const btn = createElement('button', 'quiz-option', opt);
      btn.addEventListener('click', () => handleAnswer(optionsDiv, btn, opt, correctAnswer, problem));
      optionsDiv.appendChild(btn);
    });
    card.appendChild(optionsDiv);
    page.appendChild(card);
  }

  function renderApproachQuestion(page, problem) {
    const card = createElement('div', 'quiz-card');
    card.innerHTML = `
      <h3 class="quiz-question">Describe the approach for this problem:</h3>
      <div class="quiz-problem-name">${escapeHtml(problem.title)}</div>
      <p class="quiz-problem-category" style="color:${getCategoryColor(problem.category)}">${problem.category} • ${problem.difficulty}</p>
    `;

    const answerArea = createElement('textarea', 'quiz-answer-area');
    answerArea.placeholder = 'Type your approach here...';
    card.appendChild(answerArea);

    const revealBtn = createElement('button', 'btn btn-primary', 'Reveal Answer');
    revealBtn.addEventListener('click', () => {
      const result = createElement('div', 'quiz-result');
      result.innerHTML = `
        <h4>Correct Approach:</h4>
        <p>${escapeHtml(problem.approach)}</p>
        <p><strong>Key Insight:</strong> ${escapeHtml(problem.key_insight)}</p>
        <p><strong>Patterns:</strong> ${problem.patterns.join(', ')}</p>
        <p><strong>Complexity:</strong> Time ${problem.time_complexity}, Space ${problem.space_complexity}</p>
      `;
      card.appendChild(result);

      const selfRate = createElement('div', 'quiz-self-rate');
      selfRate.innerHTML = '<p>How did you do?</p>';
      const correctBtn = createElement('button', 'btn btn-success', '✓ Got it');
      const wrongBtn = createElement('button', 'btn btn-danger', '✗ Missed it');
      correctBtn.addEventListener('click', () => { score++; results.push({ problem, correct: true }); current++; showQuestion(); });
      wrongBtn.addEventListener('click', () => { results.push({ problem, correct: false }); current++; showQuestion(); });
      selfRate.appendChild(correctBtn);
      selfRate.appendChild(wrongBtn);
      card.appendChild(selfRate);
      revealBtn.remove();
    });
    card.appendChild(revealBtn);
    page.appendChild(card);
  }

  function handleAnswer(optionsDiv, btn, selected, correct, problem) {
    const isCorrect = selected === correct;
    if (isCorrect) score++;
    results.push({ problem, correct: isCorrect });

    optionsDiv.querySelectorAll('.quiz-option').forEach(b => {
      b.disabled = true;
      if (b.textContent === correct) b.classList.add('correct');
      if (b === btn && !isCorrect) b.classList.add('wrong');
    });

    const feedback = createElement('div', 'quiz-result');
    feedback.innerHTML = isCorrect
      ? `<p class="quiz-correct">✓ Correct!</p>`
      : `<p class="quiz-wrong">✗ Wrong — the answer is <strong>${escapeHtml(correct)}</strong></p>
         <p class="quiz-explanation">${escapeHtml(problem.key_insight)}</p>`;

    const nextBtn = createElement('button', 'btn btn-primary', current < shuffled.length - 1 ? 'Next →' : 'See Results');
    nextBtn.addEventListener('click', () => { current++; showQuestion(); });
    feedback.appendChild(nextBtn);

    optionsDiv.parentElement.appendChild(feedback);
  }

  function showResults() {
    container.innerHTML = '';
    const page = createElement('div', 'page-quiz-results');
    const pct = Math.round((score / shuffled.length) * 100);

    page.innerHTML = `
      <h2 class="page-title">Quiz Complete!</h2>
      <div class="quiz-score-card">
        <div class="quiz-score-ring">
          <svg viewBox="0 0 100 100" class="progress-ring">
            <circle cx="50" cy="50" r="45" class="progress-ring-bg"/>
            <circle cx="50" cy="50" r="45" class="progress-ring-fill" 
              style="stroke-dasharray: ${pct * 2.83} ${283 - pct * 2.83}" />
          </svg>
          <div class="quiz-score-text">${pct}%</div>
        </div>
        <p class="quiz-score-detail">${score} / ${shuffled.length} correct</p>
      </div>
    `;

    // Results breakdown
    const breakdown = createElement('div', 'quiz-breakdown');
    breakdown.innerHTML = '<h3>Results</h3>';
    results.forEach(r => {
      const item = createElement('div', `quiz-result-item ${r.correct ? 'correct' : 'wrong'}`);
      item.innerHTML = `
        <span>${r.correct ? '✓' : '✗'}</span>
        <a href="#/problems/${r.problem.id}">${escapeHtml(r.problem.title)}</a>
        <span class="quiz-result-cat">${r.problem.category}</span>
      `;
      breakdown.appendChild(item);
    });
    page.appendChild(breakdown);

    const actions = createElement('div', 'quiz-actions');
    actions.innerHTML = `
      <button class="btn btn-primary" onclick="window.location.hash='#/quiz'">Try Again</button>
      <button class="btn btn-secondary" onclick="window.location.hash='#/problems'">Browse Problems</button>
    `;
    page.appendChild(actions);
    container.appendChild(page);
  }

  showQuestion();
}
