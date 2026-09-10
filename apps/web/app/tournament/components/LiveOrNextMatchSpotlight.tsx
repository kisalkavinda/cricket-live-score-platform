'use client';

import Link from 'next/link';
import styles from '../tournament.module.css';
import { normalizeImageUrl } from '@/lib/utils/image-utils';

interface LiveOrNextMatchSpotlightProps {
  liveMatch: any;
  nextMatch: any;
}

export default function LiveOrNextMatchSpotlight({ liveMatch, nextMatch }: LiveOrNextMatchSpotlightProps) {
  if (liveMatch) {
    const teamAInn = liveMatch.innings?.find((i: any) => i.battingTeamId === liveMatch.teamA?.id && !i.isSuperOver);
    const teamBInn = liveMatch.innings?.find((i: any) => i.battingTeamId === liveMatch.teamB?.id && !i.isSuperOver);
    const currentInn = liveMatch.innings?.find((i: any) => i.inningsNumber === liveMatch.currentInnings);
    const battingTeam = currentInn?.battingTeamId === liveMatch.teamA?.id ? liveMatch.teamA : liveMatch.teamB;

    return (
      <section style={{ marginBottom: '36px' }}>
        <div className={`${styles.cyberPanel} ${styles.cyberPanelActive}`} style={{ padding: '24px' }}>
          {/* Top Live Banner Strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className={styles.beaconDot} />
              <span
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  color: '#EF4444',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                LIVE TELEMETRY // MATCH #{liveMatch.matchNumber} · {liveMatch.stage}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-data)' }}>
                {liveMatch.venue || 'Ratmalana Ground'}
              </span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#EF4444',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-data)',
                }}
              >
                {liveMatch.oversPerInnings || 4} OV · {liveMatch.ballsPerOver || 4} BALLS/OV
              </span>
            </div>
          </div>

          {/* Teams Combat Layout */}
          <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4 items-center mb-5">
            {/* Team A Card */}
            <div
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                background: currentInn?.battingTeamId === liveMatch.teamA?.id ? 'rgba(192, 39, 45, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: currentInn?.battingTeamId === liveMatch.teamA?.id ? '1.5px solid #C0272D' : '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {normalizeImageUrl(liveMatch.teamA?.logoUrl) ? (
                  <img
                    src={normalizeImageUrl(liveMatch.teamA?.logoUrl)!}
                    alt={liveMatch.teamA?.name}
                    referrerPolicy="no-referrer"
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#FFF', flexShrink: 0 }}>
                    {liveMatch.teamA?.shortName?.[0] || 'A'}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {liveMatch.teamA?.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: currentInn?.battingTeamId === liveMatch.teamA?.id ? '#FFB800' : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                    {currentInn?.battingTeamId === liveMatch.teamA?.id ? '● CURRENTLY BATTING' : 'FIELDING'}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.4rem', fontWeight: 900, color: '#FFB800' }}>
                  {teamAInn ? `${teamAInn.runs}/${teamAInn.wickets}` : '-'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-data)' }}>
                  {teamAInn ? `${teamAInn.overs}.${teamAInn.balls} OV` : 'YET TO BAT'}
                </div>
              </div>
            </div>

            {/* VS Divider with Target */}
            <div className="flex items-center gap-3 w-full md:w-auto md:flex-col justify-center py-1">
              <div className="h-px bg-white/10 flex-1 md:hidden" />
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>
                  VS
                </span>
                {liveMatch.target && (
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.7rem', color: '#10B981', fontWeight: 800, background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)', whiteSpace: 'nowrap' }}>
                    TARGET: {liveMatch.target}
                  </span>
                )}
              </div>
              <div className="h-px bg-white/10 flex-1 md:hidden" />
            </div>

            {/* Team B Card */}
            <div
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                background: currentInn?.battingTeamId === liveMatch.teamB?.id ? 'rgba(192, 39, 45, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: currentInn?.battingTeamId === liveMatch.teamB?.id ? '1.5px solid #C0272D' : '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {normalizeImageUrl(liveMatch.teamB?.logoUrl) ? (
                  <img
                    src={normalizeImageUrl(liveMatch.teamB?.logoUrl)!}
                    alt={liveMatch.teamB?.name}
                    referrerPolicy="no-referrer"
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#FFF', flexShrink: 0 }}>
                    {liveMatch.teamB?.shortName?.[0] || 'B'}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {liveMatch.teamB?.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: currentInn?.battingTeamId === liveMatch.teamB?.id ? '#FFB800' : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                    {currentInn?.battingTeamId === liveMatch.teamB?.id ? '● CURRENTLY BATTING' : 'FIELDING'}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.4rem', fontWeight: 900, color: '#FFB800' }}>
                  {teamBInn ? `${teamBInn.runs}/${teamBInn.wickets}` : '-'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-data)' }}>
                  {teamBInn ? `${teamBInn.overs}.${teamBInn.balls} OV` : 'YET TO BAT'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
              Ball-by-ball commentary and real-time Net Run Rate impact updating live.
            </div>

            <Link
              href={`/scorecard?matchId=${liveMatch.id}`}
              className="w-full sm:w-auto justify-center"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '9999px',
                background: 'var(--color-accent, #C0272D)',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '0.82rem',
                textDecoration: 'none',
                boxShadow: '0 0 20px rgba(192, 39, 45, 0.4)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span>Launch Live Scorecard</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (nextMatch) {
    return (
      <section style={{ marginBottom: '36px' }}>
        <div className={styles.cyberPanel} style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`${styles.beaconDot} ${styles.beaconDotGold}`} />
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.78rem', fontWeight: 900, color: '#FFB800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                NEXT FIXTURE // MATCH #{nextMatch.matchNumber} · {nextMatch.stage}
              </span>
            </div>

            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-data)' }}>
              {nextMatch.venue || 'Ratmalana Ground'} · {nextMatch.oversPerInnings || 4} OV ({nextMatch.ballsPerOver || 4} balls/ov)
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#FFF' }}>
                {nextMatch.teamA?.name || 'TBD'}
              </div>
              <span style={{ color: '#FFB800', fontWeight: 900, fontSize: '0.8rem', background: 'rgba(255,184,0,0.1)', padding: '2px 8px', borderRadius: '4px' }}>VS</span>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#FFF' }}>
                {nextMatch.teamB?.name || 'TBD'}
              </div>
            </div>

            <Link
              href={`/scorecard?matchId=${nextMatch.id}`}
              className="w-full sm:w-auto justify-center"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '0.78rem',
                textDecoration: 'none',
              }}
            >
              <span>View Match Details</span>
              <span style={{ color: '#FFB800' }}>→</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return null;
}
