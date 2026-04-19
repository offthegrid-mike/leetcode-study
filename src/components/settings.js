import { createElement, escapeHtml, showToast, createModal, downloadJSON, readFileAsJSON, timeAgo } from '../utils/helpers.js';
import { getSetting, setSetting, exportData, importData, clearAllData, getStats } from '../lib/storage.js';
import { setupSync, syncNow, disconnectSync, getSyncInfo } from '../lib/gist-sync.js';

export async function renderSettings(container) {
  container.innerHTML = '';
  const page = createElement('div', 'page-settings');
  page.innerHTML = `<h2 class="page-title">⚙️ Settings</h2>`;

  const stats = await getStats();
  const syncInfo = await getSyncInfo();

  // Cloud Sync
  const syncSection = createElement('div', 'problem-section');
  if (syncInfo.connected) {
    syncSection.innerHTML = `
      <h3 class="section-title">☁️ Cloud Sync</h3>
      <div class="setting-item">
        <div class="setting-label">
          <span class="setting-name">✅ Connected</span>
          <span class="setting-desc">Last synced: ${syncInfo.lastSyncedAt ? timeAgo(syncInfo.lastSyncedAt) : 'Never'}</span>
        </div>
        <button class="btn btn-primary" id="syncNowBtn">🔄 Sync Now</button>
      </div>
      <div class="setting-item">
        <div class="setting-label">
          <span class="setting-name">Disconnect</span>
          <span class="setting-desc">Remove sync connection (local data is kept)</span>
        </div>
        <button class="btn btn-danger" id="disconnectSyncBtn">Disconnect</button>
      </div>
    `;
  } else {
    syncSection.innerHTML = `
      <h3 class="section-title">☁️ Cloud Sync</h3>
      <p class="about-text">Sync progress across devices via a private GitHub Gist.</p>
      <div class="setting-item">
        <div class="setting-label">
          <span class="setting-name">GitHub Token</span>
          <span class="setting-desc">
            Create a <a href="https://github.com/settings/tokens/new?scopes=gist&description=LeetCode+Study+Sync" target="_blank" rel="noopener" style="color:var(--color-primary)">Personal Access Token</a> with <strong>gist</strong> scope
          </span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input type="password" id="syncTokenInput" placeholder="ghp_..."
            style="padding:8px 12px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-input-bg);color:var(--color-text);font-size:0.9rem;width:180px">
          <button class="btn btn-primary" id="connectSyncBtn">Connect</button>
        </div>
      </div>
    `;
  }
  page.appendChild(syncSection);

  // Theme
  const themeItem = createElement('div', 'setting-item');
  const currentTheme = document.body.getAttribute('data-theme') || 'dark';
  themeItem.innerHTML = `
    <div class="setting-label">
      <span class="setting-name">Theme</span>
      <span class="setting-desc">Switch between dark and light mode</span>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" id="themeSwitch" ${currentTheme === 'light' ? 'checked' : ''}>
      <span class="toggle-slider"></span>
      <span class="toggle-label">${currentTheme === 'light' ? '☀️' : '🌙'}</span>
    </label>
  `;
  page.appendChild(themeItem);

  // Preferred language
  const langItem = createElement('div', 'setting-item');
  const savedLang = await getSetting('preferredLanguage') || 'python';
  langItem.innerHTML = `
    <div class="setting-label">
      <span class="setting-name">Preferred Language</span>
      <span class="setting-desc">Default language shown in solutions</span>
    </div>
    <select class="filter-select" id="langSelect">
      <option value="python" ${savedLang === 'python' ? 'selected' : ''}>Python</option>
      <option value="javascript" ${savedLang === 'javascript' ? 'selected' : ''}>JavaScript</option>
    </select>
  `;
  page.appendChild(langItem);

  // Export
  const exportItem = createElement('div', 'setting-item');
  exportItem.innerHTML = `
    <div class="setting-label">
      <span class="setting-name">Export Progress</span>
      <span class="setting-desc">Download your progress as JSON for backup or transfer</span>
    </div>
    <button class="btn btn-primary export-btn" id="exportBtn">📥 Export</button>
  `;
  page.appendChild(exportItem);

  // Import
  const importItem = createElement('div', 'setting-item');
  importItem.innerHTML = `
    <div class="setting-label">
      <span class="setting-name">Import Progress</span>
      <span class="setting-desc">Load progress from a JSON file</span>
    </div>
    <label class="btn btn-secondary import-btn">
      📤 Import
      <input type="file" accept=".json" id="importFile" style="display:none">
    </label>
  `;
  page.appendChild(importItem);

  // Reset
  const resetItem = createElement('div', 'setting-item');
  resetItem.innerHTML = `
    <div class="setting-label">
      <span class="setting-name">Reset All Progress</span>
      <span class="setting-desc">Clear all progress, notes, and review data</span>
    </div>
    <button class="btn btn-danger" id="resetBtn">🗑️ Reset</button>
  `;
  page.appendChild(resetItem);

  // Stats
  const statsSection = createElement('div', 'problem-section');
  statsSection.innerHTML = `
    <h3 class="section-title">📊 Statistics</h3>
    <div class="settings-stats">
      <div class="settings-stat"><span class="stat-label">Total Reviews</span><span class="stat-value">${stats.totalReviews || 0}</span></div>
      <div class="settings-stat"><span class="stat-label">Problems Attempted</span><span class="stat-value">${(stats.attempted || 0) + (stats.reviewing || 0) + (stats.mastered || 0)}</span></div>
      <div class="settings-stat"><span class="stat-label">Mastered</span><span class="stat-value">${stats.mastered || 0}</span></div>
      <div class="settings-stat"><span class="stat-label">Current Streak</span><span class="stat-value">🔥 ${stats.streak || 0} days</span></div>
    </div>
  `;
  page.appendChild(statsSection);

  // About
  const aboutSection = createElement('div', 'problem-section');
  aboutSection.innerHTML = `
    <h3 class="section-title">About</h3>
    <p class="about-text">LeetCode Study — NeetCode 150 cross-device study system</p>
    <p class="about-text">Version 1.0.0 • PWA + Spaced Repetition + Quiz</p>
    <p class="about-text">Works offline • Syncs via JSON export/import</p>
  `;
  page.appendChild(aboutSection);

  container.appendChild(page);

  // Event handlers
  document.getElementById('themeSwitch')?.addEventListener('change', async (e) => {
    const theme = e.target.checked ? 'light' : 'dark';
    document.body.setAttribute('data-theme', theme);
    await setSetting('theme', theme);
    const label = e.target.parentElement.querySelector('.toggle-label');
    if (label) label.textContent = theme === 'light' ? '☀️' : '🌙';
    document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
  });

  document.getElementById('langSelect')?.addEventListener('change', async (e) => {
    await setSetting('preferredLanguage', e.target.value);
    showToast(`Default language set to ${e.target.value}`, 'success');
  });

  document.getElementById('exportBtn')?.addEventListener('click', async () => {
    const data = await exportData();
    downloadJSON(data, `leetcode-study-backup-${new Date().toISOString().slice(0, 10)}.json`);
    showToast('Progress exported!', 'success');
  });

  document.getElementById('importFile')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await readFileAsJSON(file);
      await importData(data);
      showToast('Progress imported! Refreshing...', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      showToast(`Import failed: ${err.message}`, 'error');
    }
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    createModal(
      'Reset All Progress',
      '<p>This will permanently delete all your progress, notes, and review data. This action cannot be undone.</p>',
      async () => {
        await clearAllData();
        showToast('All progress cleared', 'info');
        setTimeout(() => window.location.reload(), 500);
      }
    );
  });

  // Sync handlers
  document.getElementById('connectSyncBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('syncTokenInput');
    const token = input.value.trim();
    if (!token) { showToast('Please enter a token', 'error'); return; }

    const btn = document.getElementById('connectSyncBtn');
    btn.disabled = true;
    btn.textContent = 'Connecting...';

    try {
      const result = await setupSync(token);
      showToast(`Connected as ${result.username}!`, 'success');
      setTimeout(() => renderSettings(container), 1000);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = 'Connect';
    }
  });

  document.getElementById('syncNowBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('syncNowBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Syncing...';

    try {
      await syncNow();
      showToast('Sync complete!', 'success');
      setTimeout(() => renderSettings(container), 1000);
    } catch (err) {
      showToast(`Sync failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = '🔄 Sync Now';
    }
  });

  document.getElementById('disconnectSyncBtn')?.addEventListener('click', () => {
    createModal(
      'Disconnect Sync',
      '<p>This will remove the sync connection. Your local data and the remote Gist are kept.</p>',
      async () => {
        await disconnectSync();
        showToast('Sync disconnected', 'info');
        renderSettings(container);
      }
    );
  });
}
