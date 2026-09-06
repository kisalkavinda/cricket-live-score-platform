'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  openOfflineDB,
  enqueueOperation,
  saveAuthoritativeSnapshot,
  getAuthoritativeSnapshot,
  getPersistentClientId,
  OperationType,
  OfflineOperation,
} from './offline-db';
import { syncEngine, SyncStatusInfo, SyncState } from './sync-engine';
import { computeLocalProjection } from './projection';

export function useOfflineScorer(matchId: string, inningsId?: string, initialMatch?: any) {
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    state: 'ONLINE',
    pendingCount: 0,
    blockedCount: 0,
    failedCount: 0,
    lastError: null,
    isOnline: true,
  });

  const [projectedMatch, setProjectedMatch] = useState<any>(initialMatch || null);
  const [clientId, setClientId] = useState<string>('');

  useEffect(() => {
    setClientId(getPersistentClientId());
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus((prev) => ({ ...prev, state: 'OFFLINE', isOnline: false }));
    }

    // Initialize DB and cache initial match
    openOfflineDB().then(async () => {
      if (initialMatch) {
        await saveAuthoritativeSnapshot(matchId, initialMatch);
      }

      syncEngine.setActiveContext(matchId, inningsId);
    }).catch((err) => {
      console.warn('[useOfflineScorer] DB init warning:', err);
    });

    const unsubscribe = syncEngine.subscribe((status, proj) => {
      setSyncStatus(status);
      if (proj) {
        setProjectedMatch((prev: any) => {
          // Never let a stale offline projection downgrade a LIVE match
          if ((prev?.status === 'LIVE' || initialMatch?.status === 'LIVE') && proj.status === 'UPCOMING') {
            return prev || initialMatch;
          }
          return proj;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [matchId, inningsId, initialMatch]);

  /**
   * Authoritative snapshot update called after server actions (start match, set lineup, etc.)
   */
  const updateAuthoritativeSnapshot = useCallback(
    async (updatedMatch: any) => {
      if (!updatedMatch?.id) return;
      try {
        await saveAuthoritativeSnapshot(updatedMatch.id, updatedMatch);
        const currentInn = updatedMatch.innings?.find((i: any) => i.inningsNumber === (updatedMatch.currentInnings || 1)) || updatedMatch.innings?.[0];
        syncEngine.setActiveContext(updatedMatch.id, currentInn?.id);
        setProjectedMatch(updatedMatch);
      } catch (err) {
        console.warn('[useOfflineScorer] updateAuthoritativeSnapshot warning:', err);
      }
    },
    []
  );

  /**
   * Persists an operation to the IndexedDB outbox and updates the local projection.
   * Hard safety boundary: Never returns successfully unless persistence resolves.
   */
  const recordOfflineOperation = useCallback(
    async (operationType: OperationType, payload: any): Promise<OfflineOperation> => {
      const operationId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 1. Atomically enqueue into IndexedDB
      const op = await enqueueOperation({
        operationId,
        matchId,
        inningsId: inningsId || payload.inningsId,
        operationType,
        payload,
      });

      // 2. Compute updated local projection
      const snapshot = await getAuthoritativeSnapshot(matchId);
      if (snapshot) {
        const nextProjection = await syncEngine.getProjectedState(matchId);
        if (nextProjection) {
          setProjectedMatch(nextProjection);
        }
      }

      // 3. Trigger sync engine
      syncEngine.checkAndSync();

      return op;
    },
    [matchId, inningsId]
  );

  const syncNow = useCallback(async () => {
    await syncEngine.syncNow(matchId);
  }, [matchId]);

  const retryFailed = useCallback(async (opId: string) => {
    await syncEngine.retryFailedOperation(opId);
  }, []);

  return {
    syncStatus,
    projectedMatch,
    clientId,
    recordOfflineOperation,
    syncNow,
    retryFailed,
    updateAuthoritativeSnapshot,
    isOffline: !syncStatus.isOnline || syncStatus.state === 'OFFLINE',
  };
}
