// ─────────────────────────────────────────────
// 세션 저장소 (IndexedDB 래퍼)
// 기기·브라우저 로컬 저장. 서버/외부 의존성 없음.
// 레코드: { id, createdAt, durationSec, mimeType, size, audioBlob, transcript }
// ─────────────────────────────────────────────

const DB_NAME = 'rehearsal-db';
const DB_VERSION = 1;
const STORE = 'sessions';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

/** 세션 저장. id 반환. */
export async function saveSession(session) {
  const db = await openDB();
  try {
    return await tx(db, 'readwrite', (store) => store.add(session));
  } finally {
    db.close();
  }
}

/** 전체 세션을 최신순으로 반환 (blob 포함). */
export async function listSessions() {
  const db = await openDB();
  try {
    const all = await tx(db, 'readonly', (store) => store.getAll());
    return (all || []).sort((a, b) => b.createdAt - a.createdAt);
  } finally {
    db.close();
  }
}

/** 여러 세션 일괄 삭제. */
export async function deleteSessions(ids) {
  const db = await openDB();
  try {
    await tx(db, 'readwrite', (store) => {
      for (const id of ids) store.delete(id);
    });
  } finally {
    db.close();
  }
}

/** 저장 용량 추정 (표시용, 실패해도 무해). */
export async function storageEstimate() {
  try {
    if (navigator.storage?.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      return { usage, quota };
    }
  } catch { /* noop */ }
  return null;
}
