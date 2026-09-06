/**
 * CPL Scorer Offline Sync Engine
 * 
 * Responsibilities:
 * - Mutex lock protection via Web Locks API (prevents dual-tab sync race conditions)
 * - Genuine connectivity verification via /api/ping
 * - Strict FIFO sequential execution ordered by clientSequence
 * - Strict blocking: If operation #N fails, all later operations (#N+1, #N+2) are BLOCKED
 * - Error categorization: Transient (exponential backoff) vs Auth (BLOCKED) vs Conflict/Permanent (FAILED)
 * - Post-sync reconciliation: authoritativeSnapshot + remainingPending = localProjection
 */

import {
  openOfflineDB,
  getPendingOperations,
  updateOperationStatus,
  saveAuthoritativeSnapshot,
  getAuthoritativeSnapshot,
  OfflineOperation,
  OperationStatus,
} from './offline-db';
import { computeLocalProjection } from './projection';
import {
  recordDeliveryAction,
  undoLastDeliveryAction,
  changeBowlerAction,
  swapStrikerAction,
  switchBatterAction,
} from '../scoring/scoring-actions';

export type SyncState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNCED' | 'SYNC_ERROR' | 'BLOCKED';

export interface SyncStatusInfo {
  state: SyncState;
  pendingCount: number;
  blockedCount: number;
  failedCount: number;
  lastError: string | null;
  isOnline: boolean;
}

type SyncListener = (status: SyncStatusInfo, projectedMatch?: any) => void;

class SyncEngine {
  private listeners: Set<SyncListener> = new Set();
  private inMemoryLock: boolean = false;
  private backoffTimer: any = null;
  private currentBackoffMs: number = 1000;
  private maxBackoffMs: number = 30000;
  private activeMatchId: string | null = null;
  private activeInningsId: string | null = null;
  private lastKnownState: SyncState = 'ONLINE';
  private lastKnownError: string | null = null;
  private isOnlineSignal: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnlineSignal = navigator.onLine;

      window.addEventListener('online', () => {
        this.isOnlineSignal = true;
        this.handleConnectivityChange();
      });

      window.addEventListener('offline', () => {
        this.isOnlineSignal = false;
        this.lastKnownState = 'OFFLINE';
        this.notify();
      });
    }
  }

  public setActiveContext(matchId: string, inningsId?: string): void {
    this.activeMatchId = matchId;
    this.activeInningsId = inningsId || null;
    this.checkAndSync();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Tests genuine reachability to the server via /api/ping.
   */
  public async probeReachability(): Promise<boolean> {
    if (typeof window === 'undefined') return true;
    if (!navigator.onLine) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Manual user recovery trigger: Resets blocked/pending operations and attempts sync.
   */
  public async syncNow(matchId?: string): Promise<void> {
    const targetMatchId = matchId || this.activeMatchId;
    if (!targetMatchId) return;

    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = null;
    }
    this.currentBackoffMs = 1000;
    await this.runSync(targetMatchId);
  }

  /**
   * Retries a specific failed operation and unblocks subsequent operations.
   */
  public async retryFailedOperation(operationId: string): Promise<void> {
    await updateOperationStatus(operationId, 'PENDING', { lastError: null });
    await this.syncNow();
  }

  private handleConnectivityChange(): void {
    if (this.isOnlineSignal) {
      this.probeReachability().then((reachable) => {
        if (reachable) {
          this.checkAndSync();
        } else {
          this.lastKnownState = 'OFFLINE';
          this.notify();
        }
      });
    } else {
      this.lastKnownState = 'OFFLINE';
      this.notify();
    }
  }

  public checkAndSync(): void {
    if (!this.activeMatchId) return;
    this.runSync(this.activeMatchId).catch((err) => {
      console.warn('[SyncEngine] Background sync loop warning:', err);
    });
  }

  /**
   * Executes synchronization with browser mutex lock and error boundaries.
   */
  private async runSync(matchId: string): Promise<void> {
    // Acquire cross-tab or in-memory lock
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      try {
        await navigator.locks.request('cpl_scorer_sync_lock', { ifAvailable: true }, async (lock) => {
          if (!lock) {
            // Another tab is actively syncing
            return;
          }
          await this.executeSyncPipeline(matchId);
        });
      } catch {
        // Fallback to in-memory lock
        if (this.inMemoryLock) return;
        this.inMemoryLock = true;
        try {
          await this.executeSyncPipeline(matchId);
        } finally {
          this.inMemoryLock = false;
        }
      }
    } else {
      if (this.inMemoryLock) return;
      this.inMemoryLock = true;
      try {
        await this.executeSyncPipeline(matchId);
      } finally {
        this.inMemoryLock = false;
      }
    }
  }

  private async executeSyncPipeline(matchId: string): Promise<void> {
    const queue = await getPendingOperations(matchId, this.activeInningsId || undefined);

    if (queue.length === 0) {
      this.lastKnownState = this.isOnlineSignal ? 'ONLINE' : 'OFFLINE';
      this.lastKnownError = null;
      await this.notify();
      return;
    }

    // Probe genuine connectivity before processing
    const isReachable = await this.probeReachability();
    if (!isReachable) {
      this.lastKnownState = 'OFFLINE';
      this.scheduleRetry(matchId);
      await this.notify();
      return;
    }

    this.lastKnownState = 'SYNCING';
    await this.notify();

    // Replay queue strictly in clientSequence order
    for (let i = 0; i < queue.length; i++) {
      const op = queue[i];

      // Mark currently syncing
      await updateOperationStatus(op.operationId, 'SYNCING', { incrementAttempts: true });
      await this.notify();

      try {
        const result = await this.dispatchOperation(op);

        if (result && result.success) {
          // Success: Mark SYNCED
          await updateOperationStatus(op.operationId, 'SYNCED');

          // If updated match state returned, update authoritative snapshot
          if (result.updatedMatch) {
            await saveAuthoritativeSnapshot(matchId, result.updatedMatch);
          }

          this.currentBackoffMs = 1000;
        } else {
          // Rejection or failure
          const errorMsg = result?.error || 'Operation rejected by server.';
          await this.handleOperationFailure(op, queue.slice(i + 1), errorMsg, 'CONFLICT');
          break; // Stop loop immediately
        }
      } catch (err: any) {
        const errorCategory = this.categorizeError(err);

        if (errorCategory === 'AUTH') {
          // Session expired: Mark BLOCKED
          await updateOperationStatus(op.operationId, 'BLOCKED', { lastError: 'Session expired. Authorization required.' });
          await this.blockSubsequentOperations(queue.slice(i + 1), 'Waiting for prior authorization');
          this.lastKnownState = 'BLOCKED';
          this.lastKnownError = 'Scorer session expired. Please re-authenticate.';
          await this.notify();
          return;
        } else if (errorCategory === 'TRANSIENT') {
          // Network drop / timeout: Revert to PENDING, schedule retry
          await updateOperationStatus(op.operationId, 'PENDING', { lastError: err.message });
          this.lastKnownState = 'OFFLINE';
          this.scheduleRetry(matchId);
          await this.notify();
          return;
        } else {
          // Permanent / Conflict error
          await this.handleOperationFailure(op, queue.slice(i + 1), err.message || 'Scoring error', errorCategory);
          break; // Stop loop immediately
        }
      }
    }

    // Check remaining queue counts
    const remaining = await getPendingOperations(matchId, this.activeInningsId || undefined);
    const hasBlocked = remaining.some(r => r.status === 'BLOCKED');
    const hasFailed = remaining.some(r => r.status === 'FAILED');

    if (hasFailed || hasBlocked) {
      this.lastKnownState = hasBlocked ? 'BLOCKED' : 'SYNC_ERROR';
    } else if (remaining.length === 0) {
      this.lastKnownState = 'SYNCED';
    } else {
      this.lastKnownState = 'ONLINE';
    }

    await this.notify();
  }

  private async handleOperationFailure(
    failedOp: OfflineOperation,
    subsequentOps: OfflineOperation[],
    errorMessage: string,
    category: 'CONFLICT' | 'PERMANENT'
  ): Promise<void> {
    await updateOperationStatus(failedOp.operationId, 'FAILED', { lastError: errorMessage });
    await this.blockSubsequentOperations(subsequentOps, `Blocked by failed operation #${failedOp.clientSequence}: ${errorMessage}`);
    this.lastKnownState = 'SYNC_ERROR';
    this.lastKnownError = errorMessage;
    await this.notify();
  }

  private async blockSubsequentOperations(ops: OfflineOperation[], reason: string): Promise<void> {
    for (const op of ops) {
      await updateOperationStatus(op.operationId, 'BLOCKED', { lastError: reason });
    }
  }

  private categorizeError(err: any): 'TRANSIENT' | 'AUTH' | 'CONFLICT' | 'PERMANENT' {
    const msg = (err?.message || '').toLowerCase();
    const status = err?.status || err?.statusCode;

    if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('session expired') || msg.includes('requireadminauth')) {
      return 'AUTH';
    }

    if (
      msg.includes('network') ||
      msg.includes('fetch') ||
      msg.includes('timeout') ||
      msg.includes('connection reset') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('failed to fetch')
    ) {
      return 'TRANSIENT';
    }

    if (msg.includes('server state changed') || msg.includes('conflict') || msg.includes('stale') || msg.includes('cannot score')) {
      return 'CONFLICT';
    }

    return 'PERMANENT';
  }

  private scheduleRetry(matchId: string): void {
    if (this.backoffTimer) return;
    this.backoffTimer = setTimeout(() => {
      this.backoffTimer = null;
      this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, this.maxBackoffMs);
      this.runSync(matchId).catch(() => {});
    }, this.currentBackoffMs);
  }

  private async dispatchOperation(op: OfflineOperation): Promise<any> {
    const { operationType, payload, operationId, clientId, inningsId } = op;

    switch (operationType) {
      case 'RECORD_DELIVERY':
        return await recordDeliveryAction(inningsId, {
          ...payload,
          operationId,
          clientId,
        });

      case 'UNDO_DELIVERY':
        return await undoLastDeliveryAction(inningsId, operationId, clientId);

      case 'CHANGE_BOWLER':
        return await changeBowlerAction(inningsId, payload.bowlerId, operationId, clientId);

      case 'SWAP_STRIKER':
        return await swapStrikerAction(inningsId, operationId, clientId);

      case 'SWITCH_BATTER':
        return await switchBatterAction(inningsId, payload.role, payload.newPlayerId, operationId, clientId);

      default:
        throw new Error(`Unsupported operation type: ${operationType}`);
    }
  }

  public async getProjectedState(matchId: string): Promise<any> {
    const snapshot = await getAuthoritativeSnapshot(matchId);
    if (!snapshot) return null;
    const pending = await getPendingOperations(matchId);
    return computeLocalProjection(snapshot, pending);
  }

  private async notify(): Promise<void> {
    if (!this.activeMatchId) return;

    let pendingCount = 0;
    let blockedCount = 0;
    let failedCount = 0;

    try {
      const ops = await getPendingOperations(this.activeMatchId);
      pendingCount = ops.filter(o => o.status === 'PENDING' || o.status === 'SYNCING').length;
      blockedCount = ops.filter(o => o.status === 'BLOCKED').length;
      failedCount = ops.filter(o => o.status === 'FAILED').length;
    } catch {}

    const statusInfo: SyncStatusInfo = {
      state: this.lastKnownState,
      pendingCount,
      blockedCount,
      failedCount,
      lastError: this.lastKnownError,
      isOnline: this.isOnlineSignal,
    };

    let projectedMatch: any = null;
    try {
      projectedMatch = await this.getProjectedState(this.activeMatchId);
    } catch {}

    this.listeners.forEach((listener) => {
      try {
        listener(statusInfo, projectedMatch);
      } catch (e) {
        console.error('[SyncEngine] Listener error:', e);
      }
    });
  }
}

export const syncEngine = new SyncEngine();
