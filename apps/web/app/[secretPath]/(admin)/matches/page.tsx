import Link from 'next/link';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { getMatchesList } from '@/lib/scoring/scoring-service';

export const dynamic = 'force-dynamic';

export default async function AdminMatchesPage() {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();
  const matches = await getMatchesList();

  const liveMatches = matches.filter((m: any) => m.status === 'LIVE');
  const upcomingMatches = matches.filter((m: any) => m.status === 'UPCOMING');
  const completedMatches = matches.filter((m: any) => m.status === 'COMPLETED' || m.status === 'ABANDONED');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', color: '#FFFFFF' }}>
            🏏 Match Management & Live Scoring
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.88rem', marginTop: '4px' }}>
            Schedule fixtures, configure live ball-by-ball scoring, and broadcast real-time updates.
          </p>
        </div>
        <Link
          href={`/${entryPath}/matches/new`}
          style={{
            background: 'linear-gradient(135deg, #C0272D 0%, #8E1B20 100%)',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(192, 39, 45, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>+</span> Create New Match
        </Link>
      </div>

      {/* LIVE MATCHES */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF4D4D', animation: 'pulse 1.5s infinite' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#FFB800' }}>
            LIVE MATCHES ({liveMatches.length})
          </h2>
        </div>

        {liveMatches.length === 0 ? (
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px dashed rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '24px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
            No matches currently in progress. Start an upcoming match below to begin live ball-by-ball scoring.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {liveMatches.map((m: any) => {
              const currentInn = m.innings.find((i: any) => i.inningsNumber === m.currentInnings) || m.innings[0];
              return (
                <div
                  key={m.id}
                  style={{
                    background: 'rgba(255, 184, 0, 0.05)',
                    border: '1.5px solid rgba(255, 184, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#FF4D4D', color: '#FFF', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.06em' }}>
                      LIVE • INNINGS {m.currentInnings}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                      📍 {m.venue || 'Main Ground'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#FFF' }}>{m.teamA.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>{m.teamA.shortName}</div>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFB800', margin: '0 12px' }}>VS</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#FFF' }}>{m.teamB.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>{m.teamB.shortName}</div>
                    </div>
                  </div>

                  {currentInn && (
                    <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                        Batting: <strong>{currentInn.battingTeam?.name}</strong>
                      </span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFB800' }}>
                        {currentInn.runs}/{currentInn.wickets} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.6)' }}>({currentInn.overs}.{currentInn.balls} ov)</span>
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Link
                      href={`/${entryPath}/matches/${m.id}/score`}
                      style={{
                        flex: 1,
                        background: '#FFB800',
                        color: '#000',
                        textAlign: 'center',
                        padding: '10px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                      }}
                    >
                      ⚡ Open Scoring Console
                    </Link>
                    <Link
                      href={`/scorecard?matchId=${m.id}`}
                      target="_blank"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#FFF',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      Public View ↗
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* UPCOMING MATCHES */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '14px', color: '#FFF' }}>
          UPCOMING FIXTURES ({upcomingMatches.length})
        </h2>

        {upcomingMatches.length === 0 ? (
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
            No upcoming matches scheduled.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {upcomingMatches.map((m: any) => (
              <div
                key={m.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.8)', padding: '2px 8px', borderRadius: '4px' }}>
                    {m.tournament?.name || 'Tournament'} • {m.oversPerInnings} Overs
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {m.venue || 'Main Ground'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#FFF' }}>{m.teamA.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>{m.teamA.shortName}</div>
                  </div>
                  <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700 }}>VS</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#FFF' }}>{m.teamB.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>{m.teamB.shortName}</div>
                  </div>
                </div>

                <Link
                  href={`/${entryPath}/matches/${m.id}/score`}
                  style={{
                    display: 'block',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFF',
                    textAlign: 'center',
                    padding: '8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    marginTop: '12px',
                  }}
                >
                  🚀 Start Match & Setup Toss
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COMPLETED MATCHES */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '14px', color: '#FFF' }}>
          COMPLETED / PAST MATCHES ({completedMatches.length})
        </h2>

        {completedMatches.length === 0 ? (
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
            No completed matches recorded yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {completedMatches.map((m: any) => (
              <div
                key={m.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#28A745', color: '#FFF', padding: '2px 8px', borderRadius: '4px' }}>
                    COMPLETED
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {m.venue}
                  </span>
                </div>

                <div style={{ margin: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#FFF', fontWeight: 600 }}>{m.teamA.name}</span>
                    {m.innings[0] && (
                      <span style={{ color: '#FFB800', fontWeight: 700 }}>
                        {m.innings[0].runs}/{m.innings[0].wickets} ({m.innings[0].overs}.{m.innings[0].balls})
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#FFF', fontWeight: 600 }}>{m.teamB.name}</span>
                    {m.innings[1] && (
                      <span style={{ color: '#FFB800', fontWeight: 700 }}>
                        {m.innings[1].runs}/{m.innings[1].wickets} ({m.innings[1].overs}.{m.innings[1].balls})
                      </span>
                    )}
                  </div>
                </div>

                {m.resultNote && (
                  <div style={{ fontSize: '0.8rem', color: '#FFD700', fontWeight: 600, background: 'rgba(255, 215, 0, 0.08)', padding: '6px 10px', borderRadius: '6px', marginTop: '8px' }}>
                    🏆 {m.resultNote}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <Link
                    href={`/${entryPath}/matches/${m.id}/score`}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#FFF',
                      textAlign: 'center',
                      padding: '6px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      textDecoration: 'none',
                    }}
                  >
                    View Score Details
                  </Link>
                  <Link
                    href={`/scorecard?matchId=${m.id}`}
                    target="_blank"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#FFF',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      textDecoration: 'none',
                    }}
                  >
                    Scorecard ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
