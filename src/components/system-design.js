import { createElement } from '../utils/helpers.js';
import { getSetting, setSetting } from '../lib/storage.js';

const CHAPTERS = [
  { id: 1, folder: '01. Scaling', title: 'Scale from Zero to Millions' },
  { id: 2, folder: '02. Back Of the Envelope Estimation', title: 'Back of Envelope Estimation' },
  { id: 3, folder: '03. System Design Framework', title: 'System Design Framework' },
  { id: 4, folder: '04. Rate Limiter', title: 'Rate Limiter' },
  { id: 5, folder: '05. Consistent Hashing', title: 'Consistent Hashing' },
  { id: 6, folder: '06. Key-Value Store', title: 'Key-Value Store' },
  { id: 7, folder: '07. Unique-Id Generator', title: 'Unique ID Generator' },
  { id: 8, folder: '08. URL Shortener', title: 'URL Shortener' },
  { id: 9, folder: '09. Web Crawler', title: 'Web Crawler' },
  { id: 10, folder: '10. Notification System', title: 'Notification System' },
  { id: 11, folder: '11. News Feed System', title: 'News Feed System' },
  { id: 12, folder: '12. Chat System', title: 'Chat System' },
  { id: 13, folder: '13. Search Autocomplete', title: 'Search Autocomplete' },
  { id: 14, folder: '14. Youtube', title: 'YouTube' },
  { id: 15, folder: '15. Google Drive', title: 'Google Drive' },
  { id: 16, folder: '16. Proximity Service', title: 'Proximity Service' },
  { id: 17, folder: '17. Nearby Friends', title: 'Nearby Friends' },
  { id: 18, folder: '18. Google Maps', title: 'Google Maps' },
  { id: 19, folder: '19. Distributed Message Queue', title: 'Distributed Message Queue' },
  { id: 20, folder: '20. Metrics Monitoring and Alerting System', title: 'Metrics Monitoring' },
  { id: 21, folder: '21. Ad Click Event Aggregation', title: 'Ad Click Event Aggregation' },
  { id: 22, folder: '22. Hotel Reservation System', title: 'Hotel Reservation System' },
  { id: 23, folder: '23. Distributed Email Service', title: 'Distributed Email Service' },
  { id: 24, folder: '24. S3-like Object Storage', title: 'S3-like Object Storage' },
];

const BASE_URL = 'https://raw.githubusercontent.com/liquidslr/system-design-notes/main';
const cache = new Map();

function chapterUrl(folder) {
  return `${BASE_URL}/${encodeURIComponent(folder)}/Readme.md`;
}

function githubUrl(folder) {
  return `https://github.com/liquidslr/system-design-notes/tree/main/${encodeURIComponent(folder)}`;
}

async function fetchChapter(folder) {
  if (cache.has(folder)) return cache.get(folder);
  const res = await fetch(chapterUrl(folder));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  cache.set(folder, text);
  return text;
}

/** Minimal inline markdown → HTML renderer */
function renderMarkdown(md, baseImageUrl = '') {
  const lines = md.split('\n');
  const html = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines = [];
  let inUl = false;
  let inOl = false;
  let inParagraph = false;

  function closeList() {
    if (inUl) { html.push('</ul>'); inUl = false; }
    if (inOl) { html.push('</ol>'); inOl = false; }
  }
  function closeParagraph() {
    if (inParagraph) { html.push('</p>'); inParagraph = false; }
  }

  function resolveImageSrc(src) {
    if (!src || src.startsWith('http')) return src;
    // Strip leading ./ and combine with base URL
    const relative = src.replace(/^\.\//, '');
    return baseImageUrl ? `${baseImageUrl}/${relative}` : src;
  }

  function rewriteImgTag(tag) {
    // Rewrite src to absolute URL, preserve alt, strip width/height/style for responsive CSS
    return tag.replace(/\bsrc=["']([^"']*)["']/i, (_, src) => {
      const abs = resolveImageSrc(src);
      return `src="${abs}"`;
    }).replace(/\s*(width|height|style)=["'][^"']*["']/gi, '');
  }

  function inlineFormat(text) {
    // Rewrite <img> src to absolute URLs (render as actual images)
    text = text.replace(/<img([^>]*)>/gi, (_, attrs) => rewriteImgTag(`<img${attrs}>`));
    // Strip <div> wrapper tags (keep content, discard styling)
    text = text.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '');

    // Links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) =>
      `<a href="${u}" target="_blank" rel="noopener">${t}</a>`
    );
    // Bold: **text**
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic: _text_ or *text* (not **)
    text = text.replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/(?<!_)_(?!_)([^_]+)(?<!_)_(?!_)/g, '<em>$1</em>');
    // Inline code: `code`
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    return text;
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw;

    // Fenced code block
    if (/^```/.test(line)) {
      if (!inCodeBlock) {
        closeParagraph();
        closeList();
        codeLang = line.slice(3).trim();
        codeLines = [];
        inCodeBlock = true;
      } else {
        const escaped = codeLines.join('\n')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        html.push(`<pre><code${codeLang ? ` class="language-${codeLang}"` : ''}>${escaped}</code></pre>`);
        inCodeBlock = false;
        codeLines = [];
        codeLang = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(raw);
      continue;
    }

    // Headings
    if (/^#{1,6}\s/.test(line)) {
      closeParagraph();
      closeList();
      const level = line.match(/^(#+)/)[1].length;
      const text = inlineFormat(line.replace(/^#+\s+/, ''));
      html.push(`<h${level}>${text}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      closeParagraph();
      closeList();
      html.push('<hr>');
      continue;
    }

    // Unordered list
    if (/^(\s*[-*+])\s/.test(line)) {
      closeParagraph();
      if (!inUl) { if (inOl) { html.push('</ol>'); inOl = false; } html.push('<ul>'); inUl = true; }
      html.push(`<li>${inlineFormat(line.replace(/^\s*[-*+]\s+/, ''))}</li>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      closeParagraph();
      if (!inOl) { if (inUl) { html.push('</ul>'); inUl = false; } html.push('<ol>'); inOl = true; }
      html.push(`<li>${inlineFormat(line.replace(/^\d+\.\s+/, ''))}</li>`);
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      closeParagraph();
      closeList();
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      closeParagraph();
      closeList();
      html.push(`<blockquote>${inlineFormat(line.replace(/^>\s?/, ''))}</blockquote>`);
      continue;
    }

    // Table row (basic detection)
    if (/^\|/.test(line)) {
      // Skip separator rows like |---|---|
      if (/^\|[\s\-:|]+\|/.test(line)) continue;
      closeParagraph();
      closeList();
      const cells = line.split('|').slice(1, -1).map(c => `<td>${inlineFormat(c.trim())}</td>`).join('');
      html.push(`<tr>${cells}</tr>`);
      continue;
    }

    // Regular paragraph text
    closeList();
    if (!inParagraph) { html.push('<p>'); inParagraph = true; }
    else { html[html.length - 1] += '<br>'; }
    html[html.length - 1] += inlineFormat(line.trim());
  }

  closeParagraph();
  closeList();
  if (inCodeBlock && codeLines.length) {
    const escaped = codeLines.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html.push(`<pre><code>${escaped}</code></pre>`);
  }

  return html.join('\n');
}

export async function renderSystemDesign(container, initialChapterId = 1) {
  container.innerHTML = '';

  let currentChapterId = initialChapterId;
  let readProgress = {};
  try {
    readProgress = (await getSetting('sdProgress')) || {};
  } catch (_) {}

  // Build layout
  const layout = createElement('div', 'sd-layout');

  // Sidebar
  const sidebar = createElement('div', 'sd-sidebar');
  const sidebarTitle = createElement('h2', '', '🏗️ System Design');

  // Search bar
  const searchInput = createElement('input', 'sd-search-input');
  searchInput.type = 'search';
  searchInput.placeholder = '🔍 Search chapters…';
  searchInput.setAttribute('aria-label', 'Search chapters');

  const chapterList = createElement('ul', 'sd-chapter-list');

  function renderChapterList(filter = '') {
    chapterList.innerHTML = '';
    const q = filter.toLowerCase().trim();
    CHAPTERS.forEach(ch => {
      if (q && !ch.title.toLowerCase().includes(q)) return;
      const item = createElement('li', 'sd-chapter-item');
      if (readProgress[ch.folder]) item.classList.add('sd-read');
      if (parseInt(item.dataset.chapterId) === currentChapterId) item.classList.add('active');
      const link = createElement('a', 'sd-chapter-link', `${ch.id}. ${ch.title}`);
      link.href = `#/system-design/${ch.id}`;
      link.addEventListener('click', e => {
        e.preventDefault();
        loadChapter(ch.id);
      });
      item.appendChild(link);
      if (readProgress[ch.folder]) {
        const check = createElement('span', 'sd-read-badge', '✓');
        item.appendChild(check);
      }
      item.dataset.chapterId = ch.id;
      chapterList.appendChild(item);
    });
    if (q && chapterList.children.length === 0) {
      chapterList.innerHTML = '<li class="sd-no-results">No chapters match</li>';
    }
  }

  searchInput.addEventListener('input', () => renderChapterList(searchInput.value));

  sidebar.appendChild(sidebarTitle);
  sidebar.appendChild(searchInput);
  sidebar.appendChild(chapterList);

  // Content area
  const content = createElement('div', 'sd-content');
  const contentHeader = createElement('div', 'sd-content-header');
  const markdownBody = createElement('div', 'sd-markdown-body');
  const navFooter = createElement('div', 'sd-nav-footer');

  content.appendChild(contentHeader);
  content.appendChild(markdownBody);
  content.appendChild(navFooter);

  layout.appendChild(sidebar);
  layout.appendChild(content);
  container.appendChild(layout);

  function updateActiveChapter(id) {
    chapterList.querySelectorAll('.sd-chapter-item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.chapterId) === id);
    });
    // Scroll active item into view in sidebar
    const activeItem = chapterList.querySelector('.sd-chapter-item.active');
    if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
  }

  function renderNavFooter(id) {
    navFooter.innerHTML = '';
    const prev = CHAPTERS.find(c => c.id === id - 1);
    const next = CHAPTERS.find(c => c.id === id + 1);

    if (prev) {
      const btn = createElement('button', 'btn btn-secondary sd-nav-btn', `← ${prev.title}`);
      btn.addEventListener('click', () => loadChapter(prev.id));
      navFooter.appendChild(btn);
    } else {
      navFooter.appendChild(createElement('span', ''));
    }

    if (next) {
      const btn = createElement('button', 'btn btn-secondary sd-nav-btn', `${next.title} →`);
      btn.addEventListener('click', () => loadChapter(next.id));
      navFooter.appendChild(btn);
    }
  }

  function renderContentHeader(ch) {
    contentHeader.innerHTML = '';
    const titleEl = createElement('h2', 'sd-content-title', `${ch.id}. ${ch.title}`);
    const rightGroup = document.createElement('div');
    rightGroup.style.display = 'flex';
    rightGroup.style.alignItems = 'center';
    rightGroup.style.gap = '12px';

    const label = document.createElement('label');
    label.className = 'sd-read-toggle';
    label.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:var(--text-sm);cursor:pointer;white-space:nowrap;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!readProgress[ch.folder];
    checkbox.addEventListener('change', async () => {
      readProgress[ch.folder] = checkbox.checked;
      // Update sidebar item
      const sidebarItem = chapterList.querySelector(`[data-chapter-id="${ch.id}"]`);
      if (sidebarItem) {
        sidebarItem.classList.toggle('sd-read', checkbox.checked);
        const existing = sidebarItem.querySelector('.sd-read-badge');
        if (checkbox.checked && !existing) {
          const badge = createElement('span', 'sd-read-badge', '✓');
          sidebarItem.appendChild(badge);
        } else if (!checkbox.checked && existing) {
          existing.remove();
        }
      }
      try { await setSetting('sdProgress', readProgress); } catch (_) {}
    });
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode('Mark as read'));

    const ghLink = createElement('a', 'sd-github-link', '↗ GitHub');
    ghLink.href = githubUrl(ch.folder);
    ghLink.target = '_blank';
    ghLink.rel = 'noopener';

    rightGroup.appendChild(label);
    rightGroup.appendChild(ghLink);
    contentHeader.appendChild(titleEl);
    contentHeader.appendChild(rightGroup);
  }

  async function loadChapter(id) {
    const ch = CHAPTERS.find(c => c.id === id);
    if (!ch) return;
    currentChapterId = id;

    // Update URL hash without triggering a full navigation
    const newHash = `#/system-design/${id}`;
    if (window.location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }

    updateActiveChapter(id);
    renderContentHeader(ch);
    renderNavFooter(id);
    content.scrollTop = 0;

    // Show spinner
    markdownBody.innerHTML = '<div class="sd-spinner" aria-label="Loading…"><div class="sd-spinner-ring"></div><p>Loading…</p></div>';

    try {
      const md = await fetchChapter(ch.folder);
      const baseImageUrl = `${BASE_URL}/${encodeURIComponent(ch.folder)}`;
      markdownBody.innerHTML = renderMarkdown(md, baseImageUrl);
    } catch {
      markdownBody.innerHTML = `
        <div class="sd-error">
          <p>⚠️ Failed to load chapter content.</p>
          <a href="${githubUrl(ch.folder)}" target="_blank" rel="noopener" class="btn btn-primary">
            View on GitHub instead
          </a>
        </div>`;
    }
  }

  // Render initial chapter list and load first chapter
  renderChapterList();
  loadChapter(initialChapterId);
}
