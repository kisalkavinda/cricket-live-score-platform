'use client';

import Link from 'next/link';
import styles from '../tournament.module.css';
import { normalizeImageUrl } from '@/lib/utils/image-utils';

interface SixTeamWildcardSectionProps {
  wildcard: {
    matches: any[];
    wc1: any | null;
    wc2: any | null;
    wc3: any | null;
    wc1Winner?: any | null;
    wc2Winner?: any | null;
    wc3Winner?: any | null;
    qualifier1?: any | null;
    qualifier2?: any | null;
    qualifier3?: any | null;
    qualifier4?: any | null;
  };
}

export default function SixTeamWildcardSection({ wildcard }: SixTeamWildcardSectionProps) {
  const wc1 = wildcard?.wc1;
  const wc2 = wildcard?.wc2;
  const wc3 = wildcard?.wc3;

  const wc1Winner = wc1?.status === 'COMPLETED' && wc1?.winnerTeamId ? wc1.winnerTeam : null;
  const wc1Loser = wc1?.status === 'COMPLETED' && wc1?.winnerTeamId
    ? (wc1.teamAId === wc1.winnerTeamId ? wc1.teamB : wc1.teamA)
    : null;

  const wc2Winner = wc2?.status === 'COMPLETED' && wc2?.winnerTeamId ? wc2.winnerTeam : null;
  const wc2Loser = wc2?.status === 'COMPLETED' && wc2?.winnerTeamId
    ? (wc2.teamAId === wc2.winnerTeamId ? wc2.teamB : wc2.teamA)
    : null;

  const wc3Winner = wc3?.status === 'COMPLETED' && wc3?.winnerTeamId ? wc3.winnerTeam : null;

  const getInningScore = (match: any, teamId: string | undefined) => {
    if (!match || !teamId) return null;
    const inn = (match.innings || []).find((i: any) => i.battingTeamId === teamId && !i.isSuperOver);
    if (!inn) return null;
    return `${inn.runs}/${inn.wickets}${inn.overs != null ? ` (${inn.overs}.${inn.balls || 0})` : ''}`;
  };

  const completedCount = [wc1, wc2, wc3].filter((m) => m?.status === 'COMPLETED').length;

  return (
    <section id="wildcard" style={{ marginBottom: '56px', scrollMarginTop: '90px' }}>
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
                Stage 2 Wildcard Pipeline · 3 Decider Matches
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
              Wildcard <span style={{ color: '#F59E0B' }}>Playoff Pipeline</span>
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'rgba(255, 255, 255, 0.65)', margin: '4px 0 0', maxWidth: '640px' }}>
              Matches 7–9 decide Seeds #3 & #4 to join the two group winners (A1 & B1) in the championship playoffs.
            </p>
          </div>

          <div className={styles.telemetryBadge} style={{ borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)' }}>
            <span style={{ color: '#F59E0B', fontWeight: 800 }}>
              {completedCount}/3 WILDCARD MATCHES RESOLVED
            </span>
          </div>
        </div>

        {/* Desktop Pipeline Layout */}
        <div className="hidden lg:grid" style={{ gridTemplateColumns: '1.2fr 48px 1.1fr 48px 0.9fr', alignItems: 'center', gap: 0, marginBottom: '20px' }}>
          {/* Col 1: Match 7 (WC1: A2 vs B2) & Match 8 (WC2: B3 vs A3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Match 7: WC1 */}
            <div className={styles.matchNodeCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} />
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, color: '#F59E0B', textTransform: 'uppercase' }}>
                    MATCH 07 // WC1 (A2 VS B2)
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: wc1?.status === 'LIVE' ? '#EF4444' : wc1Winner ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    color: wc1Winner ? '#10B981' : '#FFFFFF',
                    textTransform: 'uppercase',
                  }}
                >
                  {wc1?.status || 'SCHEDULED'}
                </span>
              </div>

              {/* Team A: A2 */}
              <div className={`${styles.teamRow} ${wc1Winner && wc1?.teamAId && wc1Winner.id === wc1.teamAId ? styles.teamRowWinner : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>A2</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wc1?.teamA?.name || 'Group A 2nd'}
                  </span>
                  {wc1Winner && wc1?.teamAId && wc1Winner.id === wc1.teamAId && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                  {getInningScore(wc1, wc1?.teamAId) || '—'}
                </span>
              </div>

              {/* Team B: B2 */}
              <div className={`${styles.teamRow} ${wc1Winner && wc1?.teamBId && wc1Winner.id === wc1.teamBId ? styles.teamRowWinner : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>B2</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wc1?.teamB?.name || 'Group B 2nd'}
                  </span>
                  {wc1Winner && wc1?.teamBId && wc1Winner.id === wc1.teamBId && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                  {getInningScore(wc1, wc1?.teamBId) || '—'}
                </span>
              </div>

              <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: wc1Winner ? '#10B981' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                  {wc1Winner ? `✓ ${wc1Winner.shortName || wc1Winner.name} → Seed #3 (P2)` : 'Winner → Seed #3 · Loser → M09 (WC3)'}
                </span>
                {wc1?.id && (
                  <Link href={`/scorecard?matchId=${wc1.id}`} style={{ fontFamily: 'var(--font-data)', fontSize: '0.7rem', color: '#FFB800', fontWeight: 800, textDecoration: 'none' }}>
                    SCORECARD →
                  </Link>
                )}
              </div>
            </div>

            {/* Match 8: WC2 (B3 vs A3) */}
            <div className={styles.matchNodeCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, color: '#EF4444', textTransform: 'uppercase' }}>
                    MATCH 08 // WC2 (B3 VS A3)
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: wc2?.status === 'LIVE' ? '#EF4444' : wc2Winner ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    color: wc2Winner ? '#10B981' : '#FFFFFF',
                    textTransform: 'uppercase',
                  }}
                >
                  {wc2?.status || 'SCHEDULED'}
                </span>
              </div>

              {/* Team A: B3 */}
              <div className={`${styles.teamRow} ${wc2Winner && wc2?.teamAId && wc2Winner.id === wc2.teamAId ? styles.teamRowWinner : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>B3</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wc2?.teamA?.name || 'Group B 3rd'}
                  </span>
                  {wc2Winner && wc2?.teamAId && wc2Winner.id === wc2.teamAId && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                  {getInningScore(wc2, wc2?.teamAId) || '—'}
                </span>
              </div>

              {/* Team B: A3 */}
              <div className={`${styles.teamRow} ${wc2Winner && wc2?.teamBId && wc2Winner.id === wc2.teamBId ? styles.teamRowWinner : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>A3</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wc2?.teamB?.name || 'Group A 3rd'}
                  </span>
                  {wc2Winner && wc2?.teamBId && wc2Winner.id === wc2.teamBId && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                  {getInningScore(wc2, wc2?.teamBId) || '—'}
                </span>
              </div>

              <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: wc2Winner ? '#10B981' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                  {wc2Winner ? `✓ ${wc2Winner.shortName || wc2Winner.name} → M09 (WC3)` : 'Winner → M09 · Loser Out ✕'}
                </span>
                {wc2?.id && (
                  <Link href={`/scorecard?matchId=${wc2.id}`} style={{ fontFamily: 'var(--font-data)', fontSize: '0.7rem', color: '#FFB800', fontWeight: 800, textDecoration: 'none' }}>
                    SCORECARD →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Col 2: Connector Arrow from WC1/WC2 into WC3 */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <svg width="32" height="120" viewBox="0 0 32 120" fill="none">
              <path d="M 4 20 H 20 V 60 H 28" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 3" />
              <path d="M 4 100 H 20 V 60 H 28" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="28" cy="60" r="3" fill="#F59E0B" />
            </svg>
          </div>

          {/* Col 3: Match 9 (WC3: WC1 Loser vs WC2 Winner) */}
          <div>
            <div className={styles.matchNodeCard} style={{ border: '1.5px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} />
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, color: '#F59E0B', textTransform: 'uppercase' }}>
                    MATCH 09 // WC3 DECIDER
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: wc3?.status === 'LIVE' ? '#EF4444' : wc3Winner ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    color: wc3Winner ? '#10B981' : '#FFFFFF',
                    textTransform: 'uppercase',
                  }}
                >
                  {wc3?.status || 'PENDING'}
                </span>
              </div>

              {/* Team A: WC1 Loser */}
              <div className={`${styles.teamRow} ${wc3Winner && wc3?.teamAId && wc3Winner.id === wc3.teamAId ? styles.teamRowWinner : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-data)', color: '#F59E0B', fontWeight: 800 }}>WC1-L</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wc3?.teamA?.name || (wc1Loser ? wc1Loser.name : 'Loser Match 07')}
                  </span>
                  {wc3Winner && wc3?.teamAId && wc3Winner.id === wc3.teamAId && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                  {getInningScore(wc3, wc3?.teamAId) || '—'}
                </span>
              </div>

              {/* Team B: WC2 Winner */}
              <div className={`${styles.teamRow} ${wc3Winner && wc3?.teamBId && wc3Winner.id === wc3.teamBId ? styles.teamRowWinner : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-data)', color: '#F59E0B', fontWeight: 800 }}>WC2-W</span>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wc3?.teamB?.name || (wc2Winner ? wc2Winner.name : 'Winner Match 08')}
                  </span>
                  {wc3Winner && wc3?.teamBId && wc3Winner.id === wc3.teamBId && <span style={{ color: '#10B981', fontSize: '0.8rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                  {getInningScore(wc3, wc3?.teamBId) || '—'}
                </span>
              </div>

              <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: wc3Winner ? '#10B981' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                  {wc3Winner ? `✓ ${wc3Winner.shortName || wc3Winner.name} → Seed #4 (P2)` : 'Winner → Seed #4 · Loser Out ✕'}
                </span>
                {wc3?.id && (
                  <Link href={`/scorecard?matchId=${wc3.id}`} style={{ fontFamily: 'var(--font-data)', fontSize: '0.7rem', color: '#FFB800', fontWeight: 800, textDecoration: 'none' }}>
                    SCORECARD →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Col 4: Connector Arrow into Playoff Badges */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
              <path d="M 4 20 H 26" stroke="#10B981" strokeWidth="2" />
              <polygon points="26,16 32,20 26,24" fill="#10B981" />
            </svg>
          </div>

          {/* Col 5: Qualified Seeds #3 & #4 Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Seed 3 */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: wc1Winner ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${wc1Winner ? '#10B981' : 'rgba(255, 255, 255, 0.1)'}`,
              }}
            >
              <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-data)', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                Playoff Seed #3 (P2)
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FFF' }}>
                {wc1Winner ? wc1Winner.name : 'Winner Match 07 (WC1)'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                Advances directly to Playoff 2 (M11)
              </div>
            </div>

            {/* Seed 4 */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: wc3Winner ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${wc3Winner ? '#10B981' : 'rgba(255, 255, 255, 0.1)'}`,
              }}
            >
              <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-data)', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                Playoff Seed #4 (P2)
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FFF' }}>
                {wc3Winner ? wc3Winner.name : 'Winner Match 09 (WC3)'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                Advances to Playoff 2 (M11)
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View (< 1024px) */}
        <div className="flex flex-col lg:hidden" style={{ gap: '14px' }}>
          {/* Match 7 */}
          <div className={styles.matchNodeCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, color: '#F59E0B' }}>
                MATCH 07 // WC1: {wc1?.teamA?.name || 'A2'} vs {wc1?.teamB?.name || 'B2'}
              </span>
              <span style={{ fontSize: '0.66rem', color: wc1Winner ? '#10B981' : '#FFF', fontWeight: 800 }}>
                {wc1Winner ? `✓ ${wc1Winner.shortName || wc1Winner.name}` : wc1?.status || 'SCHEDULED'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
              Winner → Playoff Seed #3 (M11) · Loser → Match 09 (WC3)
            </div>
          </div>

          {/* Match 8 */}
          <div className={styles.matchNodeCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, color: '#EF4444' }}>
                MATCH 08 // WC2: {wc2?.teamA?.name || 'B3'} vs {wc2?.teamB?.name || 'A3'}
              </span>
              <span style={{ fontSize: '0.66rem', color: wc2Winner ? '#10B981' : '#FFF', fontWeight: 800 }}>
                {wc2Winner ? `✓ ${wc2Winner.shortName || wc2Winner.name}` : wc2?.status || 'SCHEDULED'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
              Winner → Match 09 (WC3) · Loser Eliminated ✕
            </div>
          </div>

          {/* Match 9 */}
          <div className={styles.matchNodeCard} style={{ border: '1px solid rgba(245, 158, 11, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, color: '#F59E0B' }}>
                MATCH 09 // WC3 DECIDER: {wc3?.teamA?.name || 'WC1 Loser'} vs {wc3?.teamB?.name || 'WC2 Winner'}
              </span>
              <span style={{ fontSize: '0.66rem', color: wc3Winner ? '#10B981' : '#FFF', fontWeight: 800 }}>
                {wc3Winner ? `✓ ${wc3Winner.shortName || wc3Winner.name}` : wc3?.status || 'SCHEDULED'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
              Winner → Playoff Seed #4 (M11) · Loser Eliminated ✕
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
