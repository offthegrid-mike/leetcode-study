/**
 * GitHub Gist sync for cross-device progress sharing.
 *
 * Stores study data in a private Gist so it can be accessed from any device.
 * Uses per-record timestamps for conflict-free merging.
 */

import {
  exportData,
  getAllProgress,
  setProgress,
  getSetting,
  setSetting,
  getStudySessions,
  addStudySession,
} from './storage.js';

const GIST_FILENAME = 'leetcode-study-sync.json';

// ── GitHub API helpers ──────────────────────────────────────────────

async function apiRequest(endpoint, token, options = {}) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }

  return res.json();
}

async function validateToken(token) {
  return apiRequest('/user', token);
}

async function findSyncGist(token) {
  const gists = await apiRequest('/gists?per_page=100', token);
  return gists.find(g => g.files && g.files[GIST_FILENAME]);
}

async function createSyncGist(token, data) {
  return apiRequest('/gists', token, {
    method: 'POST',
    body: JSON.stringify({
      description: 'LeetCode Study PWA — Sync Data (auto-managed)',
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data, null, 2),
        },
      },
    }),
  });
}

async function updateSyncGist(token, gistId, data) {
  return apiRequest(`/gists/${gistId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data, null, 2),
        },
      },
    }),
  });
}

async function fetchSyncGist(token, gistId) {
  const gist = await apiRequest(`/gists/${gistId}`, token);
  const content = gist.files?.[GIST_FILENAME]?.content;
  if (!content) throw new Error('Sync file not found in gist');
  return JSON.parse(content);
}

// ── Merge logic ─────────────────────────────────────────────────────

function mergeProgress(localRecords, remoteRecords) {
  const merged = new Map();

  for (const r of localRecords) {
    merged.set(r.id, r);
  }

  for (const r of remoteRecords) {
    const existing = merged.get(r.id);
    if (!existing) {
      merged.set(r.id, r);
    } else {
      const localTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const remoteTime = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
      if (remoteTime > localTime) {
        merged.set(r.id, r);
      }
    }
  }

  return Array.from(merged.values());
}

function mergeSessions(localSessions, remoteSessions) {
  const localUuids = new Set(localSessions.map(s => s.uuid).filter(Boolean));
  const merged = [...localSessions];

  for (const rs of remoteSessions) {
    if (rs.uuid && !localUuids.has(rs.uuid)) {
      merged.push(rs);
    } else if (!rs.uuid) {
      const isDuplicate = localSessions.some(ls =>
        ls.date === rs.date &&
        ls.problemsReviewed === rs.problemsReviewed &&
        ls.quizScore === rs.quizScore
      );
      if (!isDuplicate) {
        merged.push(rs);
      }
    }
  }

  return merged;
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Connect to GitHub and set up a private Gist for syncing.
 * If an existing sync gist is found, it will be reused.
 */
export async function setupSync(token) {
  const user = await validateToken(token);

  let gist = await findSyncGist(token);
  if (!gist) {
    const data = await exportData();
    gist = await createSyncGist(token, data);
  }

  await setSetting('githubToken', token);
  await setSetting('syncGistId', gist.id);
  await setSetting('lastSyncedAt', new Date().toISOString());

  return { username: user.login, gistId: gist.id };
}

/**
 * Sync local data with the remote Gist.
 * Pulls remote data, merges by timestamp, then pushes the result.
 */
export async function syncNow() {
  const token = await getSetting('githubToken');
  const gistId = await getSetting('syncGistId');
  if (!token || !gistId) throw new Error('Sync not configured');

  // Fetch remote data
  let remote;
  try {
    remote = await fetchSyncGist(token, gistId);
  } catch {
    remote = { progress: [], settings: [], studySessions: [] };
  }

  // Get local data
  const local = await exportData();

  // Merge progress (newer updatedAt wins per record)
  const mergedProgress = mergeProgress(local.progress, remote.progress || []);

  // Merge sessions (union by uuid, deduplicate legacy sessions)
  const mergedSessions = mergeSessions(local.studySessions, remote.studySessions || []);

  // Write merged progress records to local store
  for (const record of mergedProgress) {
    await setProgress(record.id, record);
  }

  // Write only new sessions to local store
  const localUuids = new Set(local.studySessions.map(s => s.uuid).filter(Boolean));
  for (const session of mergedSessions) {
    if (session.uuid && !localUuids.has(session.uuid)) {
      await addStudySession(session);
    }
  }

  // Re-export merged local state and push to gist
  const finalData = await exportData();
  await updateSyncGist(token, gistId, finalData);

  await setSetting('lastSyncedAt', new Date().toISOString());
}

/**
 * Remove sync configuration. Local data and the remote Gist are kept.
 */
export async function disconnectSync() {
  await setSetting('githubToken', null);
  await setSetting('syncGistId', null);
  await setSetting('lastSyncedAt', null);
}

/**
 * Return current sync connection status.
 */
export async function getSyncInfo() {
  const token = await getSetting('githubToken');
  const gistId = await getSetting('syncGistId');
  const lastSyncedAt = await getSetting('lastSyncedAt');

  return {
    connected: !!(token && gistId),
    lastSyncedAt,
    gistId,
  };
}
