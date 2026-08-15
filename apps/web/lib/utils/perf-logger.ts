import 'server-only';

export interface PerfTracker {
  start: number;
  authStart?: number;
  authEnd?: number;
  dbStart?: number;
  dbEnd?: number;
  renderStart?: number;
  renderEnd?: number;
}

export function createPerfTracker(): PerfTracker {
  return {
    start: performance.now(),
  };
}

export function logPerfMetric(
  route: string,
  tracker: PerfTracker,
  extraMeta?: Record<string, string | number>
) {
  const totalMs = (performance.now() - tracker.start).toFixed(2);
  const authMs = tracker.authStart !== undefined && tracker.authEnd !== undefined
    ? (tracker.authEnd - tracker.authStart).toFixed(2)
    : '0.00';
  const dbMs = tracker.dbStart !== undefined && tracker.dbEnd !== undefined
    ? (tracker.dbEnd - tracker.dbStart).toFixed(2)
    : '0.00';
  const renderMs = tracker.renderStart !== undefined && tracker.renderEnd !== undefined
    ? (tracker.renderEnd - tracker.renderStart).toFixed(2)
    : '0.00';

  const metaStr = extraMeta
    ? ' ' + Object.entries(extraMeta).map(([k, v]) => `${k}=${v}`).join(' ')
    : '';

  console.log(
    `[PERF] route="${route}" auth_ms=${authMs} db_ms=${dbMs} render_ms=${renderMs} total_ms=${totalMs}${metaStr}`
  );
}
