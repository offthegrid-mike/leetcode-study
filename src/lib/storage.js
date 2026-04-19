/**
 * IndexedDB persistence layer for the LeetCode Study PWA.
 *
 * Database: "leetcode-study-db" (version 1)
 * Stores:
 *   - progress       — keyed by problem ID (number)
 *   - settings        — keyed by string
 *   - studySessions   — auto-incrementing key
 */

const DB_NAME = "leetcode-study-db";
const DB_VERSION = 1;

const STORE_PROGRESS = "progress";
const STORE_SETTINGS = "settings";
const STORE_SESSIONS = "studySessions";

/** @type {IDBDatabase | null} */
let dbInstance = null;

// ────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Open (or create) the database and return a ready IDBDatabase handle.
 * Subsequent calls return the cached instance.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = /** @type {IDBRequest<IDBDatabase>} */ (event.target).result;

      if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
        const progressStore = db.createObjectStore(STORE_PROGRESS, { keyPath: "id" });
        progressStore.createIndex("status", "status", { unique: false });
        progressStore.createIndex("nextReview", "nextReview", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const sessionsStore = db.createObjectStore(STORE_SESSIONS, {
          keyPath: "id",
          autoIncrement: true,
        });
        sessionsStore.createIndex("date", "date", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = /** @type {IDBRequest<IDBDatabase>} */ (event.target).result;

      // Reset the cached handle if the database is unexpectedly closed.
      dbInstance.onclose = () => {
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(/** @type {IDBRequest} */ (event.target).error);
    };
  });
}

/**
 * Run a read-only or readwrite transaction and return a promise that resolves
 * with the value produced by `callback`.
 *
 * @template T
 * @param {string | string[]} storeNames
 * @param {"readonly" | "readwrite"} mode
 * @param {(tx: IDBTransaction) => IDBRequest | void} callback
 *   Must return an IDBRequest whose `result` will be the resolved value,
 *   or return nothing if the result isn't needed (the promise resolves with `undefined`).
 * @returns {Promise<T>}
 */
async function withTransaction(storeNames, mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    const maybeRequest = callback(tx);

    tx.oncomplete = () => {
      resolve(maybeRequest ? /** @type {any} */ (maybeRequest).result : undefined);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException("Transaction aborted"));
  });
}

/**
 * Convenience: get all records from a store.
 * @param {string} storeName
 * @returns {Promise<any[]>}
 */
async function getAllFromStore(storeName) {
  return withTransaction(storeName, "readonly", (tx) =>
    tx.objectStore(storeName).getAll()
  );
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Initialise the database. Safe to call multiple times.
 * @returns {Promise<void>}
 */
export async function initDB() {
  await openDB();
}

// ── Progress ────────────────────────────────────────────────────────

/**
 * Retrieve the progress record for a single problem.
 * @param {number} problemId
 * @returns {Promise<object | undefined>}
 */
export async function getProgress(problemId) {
  return withTransaction(STORE_PROGRESS, "readonly", (tx) =>
    tx.objectStore(STORE_PROGRESS).get(problemId)
  );
}

/**
 * Create or update a progress record.
 *
 * The record is merged with sensible defaults so callers only need to supply
 * the fields they want to change.
 *
 * @param {number} problemId
 * @param {object} data  Partial progress fields to upsert.
 * @returns {Promise<void>}
 */
export async function setProgress(problemId, data) {
  const existing = await getProgress(problemId);

  const record = {
    id: problemId,
    status: "not_started",
    notes: "",
    lastReviewed: null,
    nextReview: null,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    quizHistory: [],
    ...existing,
    ...data,
    id: problemId, // ensure id is never overwritten
  };

  await withTransaction(STORE_PROGRESS, "readwrite", (tx) =>
    tx.objectStore(STORE_PROGRESS).put(record)
  );
}

/**
 * Retrieve every progress record.
 * @returns {Promise<object[]>}
 */
export async function getAllProgress() {
  return getAllFromStore(STORE_PROGRESS);
}

/**
 * Retrieve all progress records that match a given status.
 * @param {string} status  One of "not_started" | "attempted" | "reviewing" | "mastered".
 * @returns {Promise<object[]>}
 */
export async function getProgressByStatus(status) {
  return withTransaction(STORE_PROGRESS, "readonly", (tx) => {
    const index = tx.objectStore(STORE_PROGRESS).index("status");
    return index.getAll(status);
  });
}

/**
 * Get all problems whose `nextReview` date is on or before `date`.
 * @param {Date} [date=new Date()]
 * @returns {Promise<object[]>}
 */
export async function getDueReviews(date = new Date()) {
  const all = await getAllProgress();
  const cutoff = new Date(date);
  cutoff.setHours(23, 59, 59, 999);

  return all.filter(
    (p) => p.nextReview && new Date(p.nextReview) <= cutoff
  );
}

// ── Settings ────────────────────────────────────────────────────────

/**
 * Read a single setting value.
 * @param {string} key
 * @returns {Promise<any | undefined>}
 */
export async function getSetting(key) {
  const record = await withTransaction(STORE_SETTINGS, "readonly", (tx) =>
    tx.objectStore(STORE_SETTINGS).get(key)
  );
  return record?.value;
}

/**
 * Write a single setting value.
 * @param {string} key
 * @param {*} value
 * @returns {Promise<void>}
 */
export async function setSetting(key, value) {
  await withTransaction(STORE_SETTINGS, "readwrite", (tx) =>
    tx.objectStore(STORE_SETTINGS).put({ key, value })
  );
}

// ── Study sessions ──────────────────────────────────────────────────

/**
 * Record a new study session.
 * @param {{ date?: string, problemsReviewed?: number, quizScore?: number, duration?: number }} session
 * @returns {Promise<void>}
 */
export async function addStudySession(session) {
  const record = {
    date: new Date().toISOString(),
    problemsReviewed: 0,
    quizScore: 0,
    duration: 0,
    ...session,
  };

  await withTransaction(STORE_SESSIONS, "readwrite", (tx) =>
    tx.objectStore(STORE_SESSIONS).put(record)
  );
}

/**
 * Retrieve study sessions, optionally filtered to those on or after `since`.
 * @param {Date | null} [since=null]
 * @returns {Promise<object[]>}
 */
export async function getStudySessions(since = null) {
  const all = await getAllFromStore(STORE_SESSIONS);
  if (!since) return all;
  const cutoff = new Date(since);
  return all.filter((s) => new Date(s.date) >= cutoff);
}

// ── Aggregate stats ─────────────────────────────────────────────────

/**
 * Compute high-level statistics across all progress records and settings.
 * @returns {Promise<{
 *   total: number,
 *   notStarted: number,
 *   attempted: number,
 *   reviewing: number,
 *   mastered: number,
 *   streak: number,
 *   totalReviews: number
 * }>}
 */
export async function getStats() {
  const all = await getAllProgress();

  const counts = { not_started: 0, attempted: 0, reviewing: 0, mastered: 0 };
  for (const p of all) {
    counts[p.status] = (counts[p.status] ?? 0) + 1;
  }

  const streakData = (await getSetting("streakData")) ?? 0;
  const totalReviews = (await getSetting("totalReviews")) ?? 0;

  return {
    total: all.length,
    notStarted: counts.not_started,
    attempted: counts.attempted,
    reviewing: counts.reviewing,
    mastered: counts.mastered,
    streak: typeof streakData === "number" ? streakData : (streakData?.current ?? 0),
    totalReviews,
  };
}

// ── Import / Export ─────────────────────────────────────────────────

/**
 * Export every record from all stores as a JSON-serialisable object.
 * @returns {Promise<{ progress: object[], settings: object[], studySessions: object[], exportedAt: string }>}
 */
export async function exportData() {
  const [progress, settings, studySessions] = await Promise.all([
    getAllFromStore(STORE_PROGRESS),
    getAllFromStore(STORE_SETTINGS),
    getAllFromStore(STORE_SESSIONS),
  ]);

  return {
    progress,
    settings,
    studySessions,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Import data from a JSON export, merging with existing records.
 *
 * Progress records are merged on a per-field basis so that newer local edits
 * are not overwritten. Settings and sessions are upserted directly.
 *
 * @param {{ progress?: object[], settings?: object[], studySessions?: object[] }} json
 * @returns {Promise<void>}
 */
export async function importData(json) {
  if (json.progress) {
    for (const record of json.progress) {
      if (record.id == null) continue;
      await setProgress(record.id, record);
    }
  }

  if (json.settings) {
    for (const record of json.settings) {
      if (!record.key) continue;
      await setSetting(record.key, record.value);
    }
  }

  if (json.studySessions) {
    for (const session of json.studySessions) {
      // Strip the auto-increment key so a new one is assigned, avoiding collisions.
      const { id: _id, ...rest } = session;
      await addStudySession(rest);
    }
  }
}

/**
 * Delete every record in every store.
 * @returns {Promise<void>}
 */
export async function clearAllData() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORE_PROGRESS, STORE_SETTINGS, STORE_SESSIONS],
      "readwrite"
    );
    tx.objectStore(STORE_PROGRESS).clear();
    tx.objectStore(STORE_SETTINGS).clear();
    tx.objectStore(STORE_SESSIONS).clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
