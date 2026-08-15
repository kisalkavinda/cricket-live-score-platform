import Link from 'next/link';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { getMatchesList } from '@/lib/scoring/scoring-service';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';
import DeleteMatchButton from '@/components/admin/DeleteMatchButton';

export const dynamic = 'force-dynamic';

export default async function AdminMatchesPage() {
  const tracker = createPerfTracker();
  tracker.authStart = performance.now();
  await requireAdminAuth();
  tracker.authEnd = performance.now();

  const entryPath = getAdminEntryPath();

  tracker.dbStart = performance.now();
  const matches = await getMatchesList();
  tracker.dbEnd = performance.now();

  tracker.renderStart = performance.now();
  tracker.renderEnd = performance.now();
  logPerfMetric('/matches', tracker);

  const liveMatches = matches.filter((m: any) => m.status === 'LIVE');
  const upcomingMatches = matches.filter((m: any) => m.status === 'UPCOMING');
  const completedMatches = matches.filter((m: any) => m.status === 'COMPLETED' || m.status === 'ABANDONED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid #1E2638',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#F59E0B',
              textTransform: 'uppercase',
              marginBottom: '4px',
              fontFamily: 'monospace',
            }}
          >
            LIVE OPERATIONS • {matches.length} TOTAL FIXTURES
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Matches & Live Scoring
          </h1>
          <p style={{ fontSize: '13px', color: '#8B9BB4', margin: '4px 0 0' }}>
            Schedule championship fixtures, control live ball-by-ball scoring, and broadcast real-time updates.
          </p>
        </div>

        <Link
          href={`/${entryPath}/matches/new`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: '#C0272D',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            border: '1px solid #D32F35',
            boxShadow: '0 2px 10px rgba(192, 39, 45, 0.3)',
          }}
        >
          <span>+</span>
          <span>Create New Match</span>
        </Link>
      </div>

      {/* 🔴 LIVE MATCHES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', margin: 0 }}>
            Live Matches ({liveMatches.length})
          </h2>
        </div>

        {liveMatches.length === 0 ? (
          <div
            style={{
              backgroundColor: '#10141E',
              border: '1px dashed #1E2638',
              borderRadius: '12px',
              padding: '32px 20px',
              textAlign: 'center',
              color: '#8B9BB4',
              fontSize: '13px',
            }}
          >
            No matches currently live. Start an upcoming fixture below to launch the live scoring engine.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '20px',
            }}
          >
            {liveMatches.map((m: any) => {
              const currentInn = m.innings?.find((i: any) => i.inningsNumber === m.currentInnings) || m.innings?.[0];
              return (
                <div
                  key={m.id}
                  style={{
                    backgroundColor: '#10141E',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#EF4444', color: '#FFFFFF', fontWeight: 800, fontFamily: 'monospace' }}>
                      ● LIVE INNINGS {m.currentInnings}
                    </span>
                    <span style={{ color: '#8B9BB4' }}>
                      📍 {m.venue || 'Main University Ground'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '4px 0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>{m.teamA.name}</div>
                      <div style={{ fontSize: '11px', color: '#8B9BB4', fontFamily: 'monospace' }}>{m.teamA.shortName}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#F59E0B', fontFamily: 'monospace', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#1E2638' }}>
                      VS
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>{m.teamB.name}</div>
                      <div style={{ fontSize: '11px', color: '#8B9BB4', fontFamily: 'monospace' }}>{m.teamB.shortName}</div>
                    </div>
                  </div>

                  {currentInn && (
                    <div
                      style={{
                        backgroundColor: '#141A26',
                        border: '1px solid #1E2638',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#CBD5E1' }}>
                        Batting: <strong style={{ color: '#FFFFFF' }}>{currentInn.battingTeam?.name}</strong>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#FBBF24', fontFamily: 'monospace' }}>
                        {currentInn.runs}/{currentInn.wickets}{' '}
                        <span style={{ fontSize: '12px', color: '#8B9BB4', fontWeight: 500 }}>
                          ({currentInn.overs}.{currentInn.balls} ov)
                        </span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                    <Link
                      href={`/${entryPath}/matches/${m.id}/score`}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#F59E0B',
                        color: '#000000',
                        fontSize: '12px',
                        fontWeight: 800,
                        textDecoration: 'none',
                        letterSpacing: '0.04em',
                      }}
                    >
                      ⚡ OPEN SCORING CONSOLE
                    </Link>
                    <Link
                      href={`/scorecard?matchId=${m.id}`}
                      target="_blank"
                      style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#1E2638',
                        color: '#E2E8F0',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        border: '1px solid #2A364E',
                      }}
                    >
                      Public View ↗
                    </Link>
                    <DeleteMatchButton isIconOnly matchId={m.id} matchTitle={`${m.teamA.name} vs ${m.teamB.name}`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📅 UPCOMING MATCHES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>📅</span>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', margin: 0 }}>
            Upcoming Fixtures ({upcomingMatches.length})
          </h2>
        </div>

        {upcomingMatches.length === 0 ? (
          <div
            style={{
              backgroundColor: '#10141E',
              border: '1px solid #1E2638',
              borderRadius: '12px',
              padding: '32px 20px',
              textAlign: 'center',
              color: '#8B9BB4',
              fontSize: '13px',
            }}
          >
            No upcoming fixtures scheduled.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {upcomingMatches.map((m: any) => (
              <div
                key={m.id}
                style={{
                  backgroundColor: '#10141E',
                  border: '1px solid #1E2638',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#1E2638', color: '#CBD5E1', fontFamily: 'monospace', fontWeight: 700 }}>
                    {m.oversPerInnings} Overs
                  </span>
                  <span style={{ color: '#8B9BB4' }}>
                    📍 {m.venue || 'Main Ground'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>{m.teamA.name}</div>
                    <div style={{ fontSize: '11px', color: '#8B9BB4', fontFamily: 'monospace' }}>{m.teamA.shortName}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', fontFamily: 'monospace' }}>VS</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>{m.teamB.name}</div>
                    <div style={{ fontSize: '11px', color: '#8B9BB4', fontFamily: 'monospace' }}>{m.teamB.shortName}</div>
                  </div>
                </div>

                <div style={{ paddingTop: '12px', borderTop: '1px solid #1E2638', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: '#8B9BB4', fontFamily: 'monospace' }}>
                    {m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : 'TBD'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link
                      href={`/${entryPath}/matches/${m.id}/score`}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#1E2638',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        border: '1px solid #2A364E',
                      }}
                    >
                      Start Match →
                    </Link>
                    <DeleteMatchButton isIconOnly matchId={m.id} matchTitle={`${m.teamA.name} vs ${m.teamB.name}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🏆 COMPLETED MATCHES */}
      {completedMatches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>🏆</span>
            <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', margin: 0 }}>
              Completed Matches ({completedMatches.length})
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {completedMatches.map((m: any) => (
              <div
                key={m.id}
                style={{
                  backgroundColor: '#10141E',
                  border: '1px solid #1E2638',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#8B9BB4' }}>
                  <span>{m.tournament?.name || 'Tournament'}</span>
                  <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34D399', fontFamily: 'monospace', fontWeight: 700 }}>
                    FINISHED
                  </span>
                </div>

                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                  {m.teamA.name} vs {m.teamB.name}
                </div>

                {m.resultNote && (
                  <div style={{ fontSize: '12px', color: '#FBBF24' }}>
                    {m.resultNote}
                  </div>
                )}

                <div style={{ paddingTop: '8px', borderTop: '1px solid #161D2B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Link
                    href={`/scorecard?matchId=${m.id}`}
                    target="_blank"
                    style={{
                      fontSize: '11px',
                      color: '#8B9BB4',
                      textDecoration: 'none',
                    }}
                  >
                    View Scorecard ↗
                  </Link>
                  <DeleteMatchButton isIconOnly matchId={m.id} matchTitle={`${m.teamA.name} vs ${m.teamB.name}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
