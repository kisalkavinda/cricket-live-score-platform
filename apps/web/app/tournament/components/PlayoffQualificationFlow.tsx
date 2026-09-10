'use client';

import Link from 'next/link';
import styles from '../tournament.module.css';

interface PlayoffQualificationFlowProps {
  qualification: {
    matches: any[];
    match9: any | null;
    match10: any | null;
    match11: any | null;
    qualifier1: any | null;
    qualifier2: any | null;
  };
}

export default function PlayoffQualificationFlow({ qualification }: PlayoffQualificationFlowProps) {
  const m9 = qualification?.match9;
  const m10 = qualification?.match10;
  const m11 = qualification?.match11;

  const m9Winner = m9?.status === 'COMPLETED' && m9?.winnerTeamId ? m9.winnerTeam : null;
  const m9Loser = m9?.status === 'COMPLETED' && m9?.winnerTeamId
    ? (m9.teamAId === m9.winnerTeamId ? m9.teamB : m9.teamA)
    : null;

  const m10Winner = m10?.status === 'COMPLETED' && m10?.winnerTeamId ? m10.winnerTeam : null;

  const m11Winner = m11?.status === 'COMPLETED' && m11?.winnerTeamId ? m11.winnerTeam : null;

  const getInningScore = (match: any, teamId: string | undefined) => {
    if (!match || !teamId) return null;
    const inn = (match.innings || []).find((i: any) => i.battingTeamId === teamId && !i.isSuperOver);
    if (!inn) return null;
    return `${inn.runs}/${inn.wickets}${inn.overs != null ? ` (${inn.overs}.${inn.balls || 0})` : ''}`;
  };

  const completedCount = [m9, m10, m11].filter((m) => m?.status === 'COMPLETED').length;

  return (
    <section id="qualification" style={{ marginBottom: '56px', scrollMarginTop: '90px' }}>
      <div
        className={styles.cyberPanel}
        style={{
          padding: '24px 26px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(15, 17, 24, 0.95) 100%)',
          border: '1.5px solid rgba(245, 158, 11, 0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ width: '8px', height: '2px', background: '#F59E0B' }} />
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#F59E0B' }}>
                Stage 2 Pipeline · Bridge to Playoff
              </span>
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
                fontWeight: 900,
                textTransform: 'uppercase',
                color: '#FFFFFF',
                margin: 0,
              }}
            >
              Playoff Qualification <span style={{ color: '#F59E0B' }}>Matrix</span>
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'rgba(255, 255, 255, 0.65)', margin: '4px 0 0', maxWidth: '640px' }}>
              Matches 9–11 decide Seeds #3 & #4 to join the two group winners in the 4-team championship playoff.
            </p>
          </div>

          <div className={styles.telemetryBadge} style={{ borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)' }}>
            <span style={{ color: '#F59E0B', fontWeight: 800 }}>
              {completedCount}/3 MATCHES RESOLVED
            </span>
          </div>
        </div>

        {/* Desktop Pipeline Layout (≥ 1024px) */}
        <div className="hidden lg:grid" style={{ gridTemplateColumns: '1.2fr 48px 1fr 48px 0.9fr', alignItems: 'center', gap: 0, marginBottom: '20px' }}>
          {/* Col 1: Match 9 (top) & Match 10 (bottom) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Match 9: 2nd vs 2nd */}
            <div className={styles.matchNodeCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} />
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, color: '#F59E0B', textTransform: 'uppercase' }}>
                    MATCH 09 // 2ND VS 2ND
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: m9?.status === 'LIVE' ? '#EF4444' : m9Winner ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    color: m9Winner ? '#10B981' : '#FFFFFF',
                    textTransform: 'uppercase',
                  }}
                >
                  {m9?.status || 'SCHEDULED'}
                </span>
              </div>

              {/* Team A */}
              <div className={`${styles.teamRow} ${m9Winner && m9?.teamAId && m9Winner.id === m9.teamAId ? styles.teamRowWinner : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>A2</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m9?.teamA?.name || 'Group A 2nd'}
                  </span>
                  {m9Winner && m9?.teamAId && m9Winner.id === m9.teamAId && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                  {getInningScore(m9, m9?.teamAId) || '—'}
                </span>
              </div>

              {/* Team B */}
              <div className={`${styles.teamRow} ${m9Winner && m9?.teamBId && m9Winner.id === m9.teamBId ? styles.teamRowWinner : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>B2</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m9?.teamB?.name || 'Group B 2nd'}
                  </span>
                  {m9Winner && m9?.teamBId && m9Winner.id === m9.teamBId && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                  {getInningScore(m9, m9?.teamBId) || '—'}
                </span>
              </div>

              <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: m9Winner ? '#10B981' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                  {m9Winner ? `✓ ${m9Winner.shortName || m9Winner.name} → Seed #3` : 'Winner → Seed #3 · Loser → M11'}
                </span>
                {m9?.id && (
                  <Link href={`/scorecard?matchId=${m9.id}`} style={{ fontFamily: 'var(--font-data)', fontSize: '0.7rem', color: '#FFB800', fontWeight: 800, textDecoration: 'none' }}>
                    SCORECARD →
                  </Link>
                )}
              </div>
            </div>

            {/* Match 10: 3rd vs 3rd */}
            <div className={styles.matchNodeCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, color: '#EF4444', textTransform: 'uppercase' }}>
                    MATCH 10 // 3RD VS 3RD
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: m10?.status === 'LIVE' ? '#EF4444' : m10Winner ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    color: m10Winner ? '#10B981' : '#FFFFFF',
                    textTransform: 'uppercase',
                  }}
                >
                  {m10?.status || 'SCHEDULED'}
                </span>
              </div>

              {/* Team A */}
              <div className={`${styles.teamRow} ${m10Winner && m10?.teamAId && m10Winner.id === m10.teamAId ? styles.teamRowWinner : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>A3</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m10?.teamA?.name || 'Group A 3rd'}
                  </span>
                  {m10Winner && m10?.teamAId && m10Winner.id === m10.teamAId && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                  {getInningScore(m10, m10?.teamAId) || '—'}
                </span>
              </div>

              {/* Team B */}
              <div className={`${styles.teamRow} ${m10Winner && m10?.teamBId && m10Winner.id === m10.teamBId ? styles.teamRowWinner : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>B3</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m10?.teamB?.name || 'Group B 3rd'}
                  </span>
                  {m10Winner && m10?.teamBId && m10Winner.id === m10.teamBId && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                  {getInningScore(m10, m10?.teamBId) || '—'}
                </span>
              </div>

              <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: m10Winner ? '#10B981' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                  {m10Winner ? `✓ ${m10Winner.shortName || m10Winner.name} → M11` : 'Winner → M11 · Loser Out'}
                </span>
                {m10?.id && (
                  <Link href={`/scorecard?matchId=${m10.id}`} style={{ fontFamily: 'var(--font-data)', fontSize: '0.7rem', color: '#FFB800', fontWeight: 800, textDecoration: 'none' }}>
                    SCORECARD →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Col 2: Connector Channel from M9/M10 into M11 */}
          <div className={styles.connectorChannel}>
            <svg className={styles.straightSvg} viewBox="0 0 48 380" preserveAspectRatio="none">
              {/* Background contrast underlays */}
              <path d="M 0 95 H 24 V 170 H 35" fill="none" stroke="#0B0B10" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" />
              <path d="M 0 285 H 24 V 210 H 35" fill="none" stroke="#0B0B10" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" />

              {/* M9 Loser line: drops down 90-deg straight to M11 Team A */}
              <path
                d="M 0 95 H 24 V 170 H 35"
                fill="none"
                stroke={m9Loser ? '#C0272D' : 'rgba(255, 255, 255, 0.22)'}
                strokeWidth="3.5"
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeDasharray={m9Loser ? 'none' : '6 4'}
              />
              {/* M9 Loser Stealth Arrowhead (Tip at x=42, 6px air gap before M11 border - ZERO OVERLAP) */}
              <polygon
                points="42,170 34,165 36.5,170 34,175"
                fill={m9Loser ? '#EF4444' : 'rgba(255, 255, 255, 0.25)'}
                filter={m9Loser ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.7))' : 'none'}
              />

              {/* M10 Winner line: rises up 90-deg straight to M11 Team B */}
              <path
                d="M 0 285 H 24 V 210 H 35"
                fill="none"
                stroke={m10Winner ? '#10B981' : 'rgba(255, 255, 255, 0.22)'}
                strokeWidth="3.5"
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeDasharray={m10Winner ? 'none' : '6 4'}
              />
              {/* M10 Winner Stealth Arrowhead (Tip at x=42, 6px air gap before M11 border - ZERO OVERLAP) */}
              <polygon
                points="42,210 34,205 36.5,210 34,215"
                fill={m10Winner ? '#10B981' : 'rgba(255, 255, 255, 0.25)'}
                filter={m10Winner ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.7))' : 'none'}
              />
            </svg>
          </div>

          {/* Col 3: Match 11: Final Qualifier */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className={styles.matchNodeCard} style={{ borderColor: 'rgba(255, 184, 0, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFB800' }} />
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, color: '#FFB800', textTransform: 'uppercase' }}>
                    MATCH 11 // FINAL QUALIFIER
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: m11?.status === 'LIVE' ? '#EF4444' : m11Winner ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    color: m11Winner ? '#10B981' : '#FFFFFF',
                    textTransform: 'uppercase',
                  }}
                >
                  {m11?.status || 'SCHEDULED'}
                </span>
              </div>

              {/* Team A: Loser Match 9 */}
              <div className={`${styles.teamRow} ${m11Winner && (m11Winner.id === (m11?.teamAId || m9Loser?.id)) ? styles.teamRowWinner : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.66rem', fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>LM9</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m11?.teamA?.name || m9Loser?.name || 'TBD (Loser Match 9)'}
                  </span>
                  {m11Winner && (m11Winner.id === (m11?.teamAId || m9Loser?.id)) && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                  {getInningScore(m11, m11?.teamAId) || '—'}
                </span>
              </div>

              {/* Team B: Winner Match 10 */}
              <div className={`${styles.teamRow} ${m11Winner && (m11Winner.id === (m11?.teamBId || m10Winner?.id)) ? styles.teamRowWinner : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.66rem', fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>WM10</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m11?.teamB?.name || m10Winner?.name || 'TBD (Winner Match 10)'}
                  </span>
                  {m11Winner && (m11Winner.id === (m11?.teamBId || m10Winner?.id)) && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                  {getInningScore(m11, m11?.teamBId) || '—'}
                </span>
              </div>

              <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: m11Winner ? '#10B981' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                  {m11Winner ? `✓ ${m11Winner.shortName || m11Winner.name} → Seed #4` : 'Winner → Seed #4 · Loser Out'}
                </span>
                {m11?.id && (
                  <Link href={`/scorecard?matchId=${m11.id}`} style={{ fontFamily: 'var(--font-data)', fontSize: '0.7rem', color: '#FFB800', fontWeight: 800, textDecoration: 'none' }}>
                    SCORECARD →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Col 4: Connector Channel from M11 into Seed Outcome */}
          <div className={styles.connectorChannel}>
            <svg className={styles.straightSvg} viewBox="0 0 48 380" preserveAspectRatio="none">
              {/* Background contrast underlay */}
              <path d="M 0 190 H 35" fill="none" stroke="#0B0B10" strokeWidth="6" strokeLinecap="square" />
              {/* Path straight across from M11 to Playoff Seed #4 */}
              <path
                d="M 0 190 H 35"
                fill="none"
                stroke={m11Winner ? '#10B981' : 'rgba(255, 255, 255, 0.22)'}
                strokeWidth="3.5"
                strokeLinecap="square"
                strokeDasharray={m11Winner ? 'none' : '6 4'}
              />
              {/* Stealth Arrowhead (Tip at x=42, 6px air gap before Seed #4 box - ZERO OVERLAP) */}
              <polygon
                points="42,190 34,185 36.5,190 34,195"
                fill={m11Winner ? '#10B981' : 'rgba(255, 255, 255, 0.25)'}
                filter={m11Winner ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.7))' : 'none'}
              />
            </svg>
          </div>

          {/* Col 5: Qualified Outcome Pill */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#FFB800', color: '#0B0B10', fontFamily: 'var(--font-data)', fontSize: '0.68rem', fontWeight: 900 }}>#3</span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', color: '#10B981', fontWeight: 800 }}>PLAYOFF SEED 3</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: m9Winner ? '#FFF' : 'rgba(255,255,255,0.45)' }}>
                {m9Winner ? m9Winner.name : 'Winner M09'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                Enters M13 vs Seed #4
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#FFB800', color: '#0B0B10', fontFamily: 'var(--font-data)', fontSize: '0.68rem', fontWeight: 900 }}>#4</span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', color: '#10B981', fontWeight: 800 }}>PLAYOFF SEED 4</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: m11Winner ? '#FFF' : 'rgba(255,255,255,0.45)' }}>
                {m11Winner ? m11Winner.name : 'Winner M11'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                Enters M13 vs Seed #3
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout (< 1024px) */}
        <div className="block lg:hidden" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Match 9 */}
            <div className={styles.matchNodeCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, color: '#F59E0B' }}>MATCH 09 // 2ND VS 2ND</span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: m9?.status === 'LIVE' ? '#EF4444' : 'rgba(255,255,255,0.06)', color: '#FFF' }}>{m9?.status || 'SCHEDULED'}</span>
              </div>
              <div className={`${styles.teamRow} ${m9Winner && m9?.teamAId && m9Winner.id === m9.teamAId ? styles.teamRowWinner : ''}`}>
                <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF' }}>{m9?.teamA?.name || 'Group A 2nd'}</span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>{getInningScore(m9, m9?.teamAId) || '—'}</span>
              </div>
              <div className={`${styles.teamRow} ${m9Winner && m9?.teamBId && m9Winner.id === m9.teamBId ? styles.teamRowWinner : ''}`}>
                <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF' }}>{m9?.teamB?.name || 'Group B 2nd'}</span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>{getInningScore(m9, m9?.teamBId) || '—'}</span>
              </div>
              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                <span style={{ color: '#10B981', fontWeight: 700 }}>{m9Winner ? `✓ ${m9Winner.name} → Seed #3` : 'Winner → Seed #3 · Loser → M11'}</span>
                {m9?.id && <Link href={`/scorecard?matchId=${m9.id}`} style={{ color: '#FFB800', fontWeight: 800 }}>SCORECARD →</Link>}
              </div>
            </div>

            {/* Stepper Connector: M09 -> M11 / Seed #3 */}
            <div className={styles.mobileStepperConnector}>
              <div className={styles.mobileStepperBadge}>
                <span>➔</span>
                <span>WINNER TAKES SEED #3 · LOSER ADVANCES TO M11</span>
              </div>
            </div>

            {/* Match 10 */}
            <div className={styles.matchNodeCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, color: '#EF4444' }}>MATCH 10 // 3RD VS 3RD</span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: m10?.status === 'LIVE' ? '#EF4444' : 'rgba(255,255,255,0.06)', color: '#FFF' }}>{m10?.status || 'SCHEDULED'}</span>
              </div>
              <div className={`${styles.teamRow} ${m10Winner && m10?.teamAId && m10Winner.id === m10.teamAId ? styles.teamRowWinner : ''}`}>
                <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF' }}>{m10?.teamA?.name || 'Group A 3rd'}</span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>{getInningScore(m10, m10?.teamAId) || '—'}</span>
              </div>
              <div className={`${styles.teamRow} ${m10Winner && m10?.teamBId && m10Winner.id === m10.teamBId ? styles.teamRowWinner : ''}`}>
                <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF' }}>{m10?.teamB?.name || 'Group B 3rd'}</span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>{getInningScore(m10, m10?.teamBId) || '—'}</span>
              </div>
              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                <span style={{ color: '#10B981', fontWeight: 700 }}>{m10Winner ? `✓ ${m10Winner.name} → M11` : 'Winner → M11 · Loser Out'}</span>
                {m10?.id && <Link href={`/scorecard?matchId=${m10.id}`} style={{ color: '#FFB800', fontWeight: 800 }}>SCORECARD →</Link>}
              </div>
            </div>

            {/* Stepper Connector: M10 -> M11 */}
            <div className={styles.mobileStepperConnector}>
              <div className={styles.mobileStepperBadge}>
                <span>➔</span>
                <span>WINNER ADVANCES TO M11 · LOSER ELIMINATED</span>
              </div>
            </div>

            {/* Match 11 */}
            <div className={styles.matchNodeCard} style={{ borderColor: 'rgba(255, 184, 0, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, color: '#FFB800' }}>MATCH 11 // FINAL QUALIFIER</span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: m11?.status === 'LIVE' ? '#EF4444' : 'rgba(255,255,255,0.06)', color: '#FFF' }}>{m11?.status || 'SCHEDULED'}</span>
              </div>
              <div className={`${styles.teamRow} ${m11Winner && (m11Winner.id === (m11?.teamAId || m9Loser?.id)) ? styles.teamRowWinner : ''}`}>
                <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF' }}>{m11?.teamA?.name || m9Loser?.name || 'TBD (Loser Match 9)'}</span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>{getInningScore(m11, m11?.teamAId) || '—'}</span>
              </div>
              <div className={`${styles.teamRow} ${m11Winner && (m11Winner.id === (m11?.teamBId || m10Winner?.id)) ? styles.teamRowWinner : ''}`}>
                <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF' }}>{m11?.teamB?.name || m10Winner?.name || 'TBD (Winner Match 10)'}</span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>{getInningScore(m11, m11?.teamBId) || '—'}</span>
              </div>
              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                <span style={{ color: '#10B981', fontWeight: 700 }}>{m11Winner ? `✓ ${m11Winner.name} → Seed #4` : 'Winner → Seed #4 · Loser Out'}</span>
                {m11?.id && <Link href={`/scorecard?matchId=${m11.id}`} style={{ color: '#FFB800', fontWeight: 800 }}>SCORECARD →</Link>}
              </div>
            </div>

            {/* Stepper Connector to Outcomes */}
            <div className={styles.mobileStepperConnector}>
              <div className={styles.mobileStepperBadge} style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10B981' }}>
                <span>➔</span>
                <span>ADVANCEMENT OUTCOMES (SEEDS #3 & #4)</span>
              </div>
            </div>

            {/* Final Playoff Destination Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div style={{ background: 'rgba(255, 184, 0, 0.04)', border: '1px solid rgba(255, 184, 0, 0.3)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.64rem', fontWeight: 900, color: '#FFB800', textTransform: 'uppercase', marginBottom: '2px' }}>
                  PLAYOFF SEED #3
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: m9Winner ? '#FFF' : 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m9Winner ? m9Winner.name : 'Winner Match 09'}
                </div>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.65rem', color: '#10B981', marginTop: '4px', fontWeight: 700 }}>
                  → Eliminator (M13)
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.64rem', fontWeight: 900, color: '#10B981', textTransform: 'uppercase', marginBottom: '2px' }}>
                  PLAYOFF SEED #4
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: m11Winner ? '#FFF' : 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m11Winner ? m11Winner.name : 'Winner Match 11'}
                </div>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.65rem', color: '#10B981', marginTop: '4px', fontWeight: 700 }}>
                  → Eliminator (M13)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Summary Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-data)',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#F59E0B', fontWeight: 800 }}>QUALIFIER 1 ADVANCEMENT:</span>
            <span>{m9Winner ? `${m9Winner.name} (Seed #3)` : 'Awaiting Match 9 Resolution'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#F59E0B', fontWeight: 800 }}>QUALIFIER 2 ADVANCEMENT:</span>
            <span>{m11Winner ? `${m11Winner.name} (Seed #4)` : 'Awaiting Match 11 Resolution'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
