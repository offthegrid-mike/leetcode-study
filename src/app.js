import { initDB, getSetting, setSetting, getAllProgress, getDueReviews, getStats } from './lib/storage.js';
import { getSyncInfo, syncNow } from './lib/gist-sync.js';
import { renderDashboard } from './components/progress.js';
import { renderProblemList } from './components/problem-list.js';
import { renderProblemView } from './components/problem-view.js';
import { renderReview } from './components/review.js';
import { renderQuiz } from './components/quiz.js';
import { renderPatterns } from './components/patterns.js';
import { renderSettings } from './components/settings.js';

class App {
  constructor() {
    this.problems = [];
    this.progress = {};
    this.mainContent = null;
    this.currentRoute = '';
  }

  async init() {
    await initDB();
    await this.loadProblems();
    await this.loadProgress();
    await this.setupTheme();
    this.setupSidebar();
    this.setupRouter();
    this.registerServiceWorker();
    this.backgroundSync();

    window.app = this;
  }

  async backgroundSync() {
    try {
      const info = await getSyncInfo();
      if (info.connected) {
        await syncNow();
        await this.loadProgress();
        this.navigate(window.location.hash || '#/');
      }
    } catch {
      // Silent fail — offline or token expired
    }
  }

  async loadProblems() {
    try {
      const res = await fetch('../src/data/problems.json');
      this.problems = await res.json();
    } catch {
      console.warn('Failed to load problems.json, trying parts...');
      try {
        const [p1, p2] = await Promise.all([
          fetch('../src/data/problems-part1.json').then(r => r.json()),
          fetch('../src/data/problems-part2.json').then(r => r.json()),
        ]);
        this.problems = [...p1, ...p2];
      } catch {
        console.error('Could not load problem data');
        this.problems = [];
      }
    }
  }

  async loadProgress() {
    const all = await getAllProgress();
    this.progress = {};
    for (const p of all) {
      this.progress[p.id] = p;
    }
  }

  async setupTheme() {
    const saved = await getSetting('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', theme);
    this.updateThemeIcon(theme);

    document.getElementById('themeToggle').addEventListener('click', async () => {
      const current = document.body.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', next);
      this.updateThemeIcon(next);
      await setSetting('theme', next);
    });
  }

  updateThemeIcon(theme) {
    document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuBtn = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('closeSidebar');

    const open = () => { sidebar.classList.add('open'); overlay.classList.add('visible'); };
    const close = () => { sidebar.classList.remove('open'); overlay.classList.remove('visible'); };

    menuBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);

    sidebar.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', close);
    });
  }

  setupRouter() {
    this.mainContent = document.getElementById('mainContent');

    const handleRoute = () => {
      const hash = window.location.hash || '#/';
      this.navigate(hash);
    };

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  async navigate(hash) {
    const [path, ...rest] = hash.replace('#', '').split('/').filter(Boolean);
    const param = rest.join('/');
    this.currentRoute = path || 'home';

    this.updateActiveNav(this.currentRoute);
    this.mainContent.innerHTML = '';
    this.mainContent.scrollTop = 0;

    await this.loadProgress();

    switch (this.currentRoute) {
      case 'home':
        renderDashboard(this.mainContent, this.problems, this.progress);
        break;
      case 'problems':
        if (param) {
          const problem = this.problems.find(p => p.id === parseInt(param));
          if (problem) {
            renderProblemView(this.mainContent, problem, this.progress[problem.id], this.problems);
          } else {
            this.mainContent.innerHTML = '<div class="empty-state"><p>Problem not found</p></div>';
          }
        } else {
          renderProblemList(this.mainContent, this.problems, this.progress);
        }
        break;
      case 'review':
        renderReview(this.mainContent, this.problems, this.progress);
        break;
      case 'quiz':
        renderQuiz(this.mainContent, this.problems, this.progress);
        break;
      case 'patterns':
        renderPatterns(this.mainContent);
        break;
      case 'settings':
        renderSettings(this.mainContent);
        break;
      default:
        renderDashboard(this.mainContent, this.problems, this.progress);
    }
  }

  updateActiveNav(page) {
    const navPage = page === 'home' ? 'home' : page;
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === navPage);
    });
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === navPage);
    });
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }
}

const app = new App();
app.init().catch(console.error);
