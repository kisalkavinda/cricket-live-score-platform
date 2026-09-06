/**
 * CPL Cricket Offline Scorer Database (IndexedDB)
 * 
 * Provides crash-resilient persistent local outbox storage for offline match scoring.
 * Enforces schema versioning (v1), payload versioning, storage quota guards,
 * and startup reset of stranded SYNCING states.
 */

export const DB_NAME = 'cpl_scorer_offline_v1';
export const DB_VERSION = 1;
export const OPERATIONS_STORE = 'offline_operations';
export const SNAPSHOTS_STORE = 'offline_snapshots';
export const CURRENT_PAYLOAD_VERSION = 1;

export type OperationType =
  | 'RECORD_DELIVERY'
  | 'UNDO_DELIVERY'
  | 'CHANGE_BOWLER'
  | 'SWAP_STRIKER'
  | 'SWITCH_BATTER';

export type OperationStatus =
  | 'PENDING'
  | 'SYNCING'
  | 'SYNCED'
  | 'FAILED'
  | 'BLOCKED';

export interface OfflineOperation {
  id?: number;
  operationId: string;       // Unique UUID v4
  clientId: string;          // Persistent client/device identity
  tournamentId?: string;
  matchId: string;
  inningsId: string;
  clientSequence: number;    // Monotonic sequence per innings
  payloadVersion: number;    // Schema version of the payload
  operationType: OperationType;
  payload: any;
  createdAt: string;
  status: OperationStatus;
  attempts: number;
  lastAttemptAt?: string | null;
  lastError?: string | null;
  syncedAt?: string | null;
}

export interface MatchRecoverySnapshot {
  matchId: string;
  snapshot: any;
  updatedAt: string;
}

/**
 * Gets or creates a persistent client/device ID.
 */
export function getPersistentClientId(): string {
  if (typeof window === 'undefined') return 'server-env';
  try {
    const key = 'cpl_scorer_device_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return 'fallback-device-id';
  }
}

/**
 * Opens or upgrades the IndexedDB database.
 */
export function openOfflineDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(OPERATIONS_STORE)) {
        const opStore = db.createObjectStore(OPERATIONS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        opStore.createIndex('operationId', 'operationId', { unique: true });
        opStore.createIndex('matchId', 'matchId', { unique: false });
        opStore.createIndex('inningsId', 'inningsId', { unique: false });
        opStore.createIndex('status', 'status', { unique: false });
        opStore.createIndex('clientSequence', 'clientSequence', { unique: false });
        opStore.createIndex('match_innings_seq', ['matchId', 'inningsId', 'clientSequence'], { unique: false });
        opStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'matchId' });
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      try {
        // Crash-safe startup transition: reset any stuck SYNCING operations to PENDING
        await resetStrandedSyncingOperations(db);
      } catch (err) {
        console.warn('[OfflineDB] Startup reset check warning:', err);
      }
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB database.'));
    };
  });
}

/**
 * Resets any operations stuck in SYNCING to PENDING upon browser restart.
 */
async function resetStrandedSyncingOperations(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([OPERATIONS_STORE], 'readwrite');
    const store = tx.objectStore(OPERATIONS_STORE);
    const index = store.index('status');
    const request = index.openCursor(IDBKeyRange.only('SYNCING'));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const updated = { ...cursor.value, status: 'PENDING' };
        cursor.update(updated);
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Computes the next clientSequence for a specific match and innings.
 */
export async function getNextClientSequence(matchId: string, inningsId: string): Promise<number> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([OPERATIONS_STORE], 'readonly');
    const store = tx.objectStore(OPERATIONS_STORE);
    const request = store.openCursor(null, 'prev'); // read in reverse to find highest ID/seq

    let maxSeq = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const item = cursor.value as OfflineOperation;
        if (item.matchId === matchId && item.inningsId === inningsId) {
          if (item.clientSequence > maxSeq) {
            maxSeq = item.clientSequence;
          }
        }
        cursor.continue();
      } else {
        resolve(maxSeq + 1);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Persists an operation atomically to the IndexedDB outbox.
 * Throws on failure or storage quota exceeded.
 */
export async function enqueueOperation(
  params: {
    operationId: string;
    tournamentId?: string;
    matchId: string;
    inningsId: string;
    operationType: OperationType;
    payload: any;
  }
): Promise<OfflineOperation> {
  const db = await openOfflineDB();
  const clientId = getPersistentClientId();
  const clientSequence = await getNextClientSequence(params.matchId, params.inningsId);

  const operation: OfflineOperation = {
    operationId: params.operationId,
    clientId,
    tournamentId: params.tournamentId,
    matchId: params.matchId,
    inningsId: params.inningsId,
    clientSequence,
    payloadVersion: CURRENT_PAYLOAD_VERSION,
    operationType: params.operationType,
    payload: params.payload,
    createdAt: new Date().toISOString(),
    status: 'PENDING',
    attempts: 0,
    lastAttemptAt: null,
    lastError: null,
    syncedAt: null,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([OPERATIONS_STORE], 'readwrite');
    const store = tx.objectStore(OPERATIONS_STORE);
    const request = store.add(operation);

    request.onsuccess = () => {
      operation.id = request.result as number;
      resolve(operation);
    };

    request.onerror = (e) => {
      const error = request.error || (e.target as any)?.error;
      if (error && error.name === 'QuotaExceededError') {
        reject(new Error('Storage quota exceeded. Cannot save offline delivery.'));
      } else {
        reject(error || new Error('Failed to persist operation to IndexedDB.'));
      }
    };
  });
}

/**
 * Retrieves all pending or syncing operations for a given match/innings, ordered by clientSequence.
 */
export async function getPendingOperations(matchId: string, inningsId?: string): Promise<OfflineOperation[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([OPERATIONS_STORE], 'readonly');
    const store = tx.objectStore(OPERATIONS_STORE);
    const request = store.openCursor();
    const results: OfflineOperation[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const item = cursor.value as OfflineOperation;
        const matchesMatch = item.matchId === matchId;
        const matchesInnings = inningsId ? item.inningsId === inningsId : true;
        const isQueued = item.status === 'PENDING' || item.status === 'SYNCING' || item.status === 'BLOCKED';

        if (matchesMatch && matchesInnings && isQueued) {
          results.push(item);
        }
        cursor.continue();
      } else {
        results.sort((a, b) => a.clientSequence - b.clientSequence);
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves all operations regardless of status for a match/innings (for inspection / audit).
 */
export async function getAllOperationsForMatch(matchId: string): Promise<OfflineOperation[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([OPERATIONS_STORE], 'readonly');
    const store = tx.objectStore(OPERATIONS_STORE);
    const request = store.openCursor();
    const results: OfflineOperation[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const item = cursor.value as OfflineOperation;
        if (item.matchId === matchId) {
          results.push(item);
        }
        cursor.continue();
      } else {
        results.sort((a, b) => a.clientSequence - b.clientSequence);
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Updates status, attempt count, and last error of an operation by operationId.
 */
export async function updateOperationStatus(
  operationId: string,
  status: OperationStatus,
  options?: {
    lastError?: string | null;
    incrementAttempts?: boolean;
    syncedAt?: string | null;
  }
): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([OPERATIONS_STORE], 'readwrite');
    const store = tx.objectStore(OPERATIONS_STORE);
    const index = store.index('operationId');
    const request = index.get(operationId);

    request.onsuccess = () => {
      const record = request.result as OfflineOperation | undefined;
      if (!record) {
        resolve();
        return;
      }

      record.status = status;
      record.lastAttemptAt = new Date().toISOString();
      if (options?.incrementAttempts) {
        record.attempts = (record.attempts || 0) + 1;
      }
      if (options?.lastError !== undefined) {
        record.lastError = options.lastError;
      }
      if (status === 'SYNCED') {
        record.syncedAt = options?.syncedAt || new Date().toISOString();
      }

      const updateReq = store.put(record);
      updateReq.onsuccess = () => resolve();
      updateReq.onerror = () => reject(updateReq.error);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a minimal authoritative recovery snapshot to IndexedDB.
 */
export async function saveAuthoritativeSnapshot(matchId: string, snapshot: any): Promise<void> {
  const db = await openOfflineDB();

  try {
    const existing = await getAuthoritativeSnapshot(matchId);
    if (existing?.status === 'LIVE' && snapshot?.status === 'UPCOMING') {
      return;
    }
  } catch {
    // Fall through to put if reading existing snapshot errors
  }

  // Sanitize to store only required recovery fields
  const cleanSnapshot = sanitizeMatchSnapshot(snapshot);

  return new Promise((resolve, reject) => {
    const tx = db.transaction([SNAPSHOTS_STORE], 'readwrite');
    const store = tx.objectStore(SNAPSHOTS_STORE);
    const item: MatchRecoverySnapshot = {
      matchId,
      snapshot: cleanSnapshot,
      updatedAt: new Date().toISOString(),
    };
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Loads the minimal authoritative recovery snapshot from IndexedDB.
 */
export async function getAuthoritativeSnapshot(matchId: string): Promise<any | null> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([SNAPSHOTS_STORE], 'readonly');
    const store = tx.objectStore(SNAPSHOTS_STORE);
    const req = store.get(matchId);
    req.onsuccess = () => {
      const result = req.result as MatchRecoverySnapshot | undefined;
      resolve(result ? result.snapshot : null);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Strips non-essential heavyweight fields from match snapshot to save storage.
 */
function sanitizeMatchSnapshot(match: any): any {
  if (!match) return null;
  return {
    id: match.id,
    tournamentId: match.tournamentId,
    status: match.status,
    oversPerInnings: match.oversPerInnings,
    ballsPerOver: match.ballsPerOver,
    currentInnings: match.currentInnings,
    teamAId: match.teamAId,
    teamBId: match.teamBId,
    teamA: match.teamA ? {
      id: match.teamA.id,
      name: match.teamA.name,
      shortName: match.teamA.shortName,
      logoUrl: match.teamA.logoUrl,
      teamPlayers: match.teamA.teamPlayers,
      tournamentSquads: match.teamA.tournamentSquads,
      players: match.teamA.players,
    } : undefined,
    teamB: match.teamB ? {
      id: match.teamB.id,
      name: match.teamB.name,
      shortName: match.teamB.shortName,
      logoUrl: match.teamB.logoUrl,
      teamPlayers: match.teamB.teamPlayers,
      tournamentSquads: match.teamB.tournamentSquads,
      players: match.teamB.players,
    } : undefined,
    tossWinnerId: match.tossWinnerId,
    tossDecision: match.tossDecision,
    innings: (match.innings || []).map((inn: any) => ({
      id: inn.id,
      inningsNumber: inn.inningsNumber,
      battingTeamId: inn.battingTeamId,
      bowlingTeamId: inn.bowlingTeamId,
      battingTeam: inn.battingTeam,
      bowlingTeam: inn.bowlingTeam,
      runs: inn.runs,
      wickets: inn.wickets,
      overs: inn.overs,
      balls: inn.balls,
      status: inn.status,
      isAllOut: inn.isAllOut,
      maxWickets: inn.maxWickets,
      currentStrikerId: inn.currentStrikerId,
      currentNonStrikerId: inn.currentNonStrikerId,
      currentBowlerId: inn.currentBowlerId,
      currentStriker: inn.currentStriker,
      currentNonStriker: inn.currentNonStriker,
      currentBowler: inn.currentBowler,
      battingScores: inn.battingScores,
      bowlingScores: inn.bowlingScores,
      ballEvents: (inn.ballEvents || []).slice(0, 30), // keep latest 30 balls
    })),
  };
}

/**
 * Returns queue counts for UI display.
 */
export async function getQueueSummary(matchId: string, inningsId?: string): Promise<{
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  blocked: number;
  total: number;
}> {
  const all = await getAllOperationsForMatch(matchId);
  const filtered = inningsId ? all.filter(op => op.inningsId === inningsId) : all;

  let pending = 0;
  let syncing = 0;
  let synced = 0;
  let failed = 0;
  let blocked = 0;

  for (const op of filtered) {
    if (op.status === 'PENDING') pending++;
    else if (op.status === 'SYNCING') syncing++;
    else if (op.status === 'SYNCED') synced++;
    else if (op.status === 'FAILED') failed++;
    else if (op.status === 'BLOCKED') blocked++;
  }

  return {
    pending,
    syncing,
    synced,
    failed,
    blocked,
    total: filtered.length,
  };
}

/**
 * Removes completed (SYNCED) operations older than given timestamp to keep storage trimmed.
 */
export async function clearCompletedOperations(matchId: string): Promise<number> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([OPERATIONS_STORE], 'readwrite');
    const store = tx.objectStore(OPERATIONS_STORE);
    const index = store.index('matchId');
    const request = index.openCursor(IDBKeyRange.only(matchId));
    let deleted = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const item = cursor.value as OfflineOperation;
        if (item.status === 'SYNCED') {
          cursor.delete();
          deleted++;
        }
        cursor.continue();
      } else {
        resolve(deleted);
      }
    };

    request.onerror = () => reject(request.error);
  });
}
