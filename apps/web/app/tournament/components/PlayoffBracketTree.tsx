'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../tournament.module.css';
import { normalizeImageUrl } from '@/lib/utils/image-utils';

interface PlayoffBracketTreeProps {
  playoffs: any;
  progress: any;
  seed1: any;
  seed2: any;
  seed3: any;
  seed4: any;
  q1: any;
  q1Winner: any;
  q1Loser: any;
  elim: any;
  elimWinner: any;
  elimLoser: any;
  q2: any;
  q2Winner: any;
  q2Loser: any;
  finalMatch: any;
  crownedChampion: any;
  tournamentFormat?: string;
}

export default function PlayoffBracketTree({
  playoffs,
  progress,
  seed1,
  seed2,
  seed3,
  seed4,
  q1,
  q1Winner,
  q1Loser,
  elim,
  elimWinner,
  elimLoser,
  q2,
  q2Winner,
  q2Loser,
  finalMatch,
  crownedChampion,
  tournamentFormat,
}: PlayoffBracketTreeProps) {
  const [mobileRoundTab, setMobileRoundTab] = useState<'ALL' | 'R1' | 'R2' | 'R3' | 'PODIUM'>('R1');

  const is6Team = tournamentFormat === '6_TEAM';
  const is7Team = tournamentFormat === '7_TEAM';

  const p1Code = is6Team ? 'M10' : is7Team ? 'M08' : 'M13';
  const p2Code = is6Team ? 'M11' : is7Team ? 'M09' : 'M14';
  const p3Code = is6Team ? 'M12' : is7Team ? 'M10' : 'M15';
  const finalCode = is6Team ? 'M13' : is7Team ? 'M11' : 'M16';

  const seed3Fallback = is6Team ? 'TBD (Winner WC1)' : is7Team ? 'TBD (Group A 2nd)' : 'TBD (Playoff Seed #3)';
  const seed4Fallback = is6Team ? 'TBD (Winner WC3)' : is7Team ? 'TBD (Group B 2nd)' : 'TBD (Playoff Seed #4)';
  const seed3Tag = is6Team ? 'WC1-W' : is7Team ? 'A2' : '#3';
  const seed4Tag = is6Team ? 'WC3-W' : is7Team ? 'B2' : '#4';

  const p3FallbackA = `TBD (Loser ${p1Code})`;
  const p3FallbackB = `TBD (Winner ${p2Code})`;
  const p3TagA = `L${p1Code}`;
  const p3TagB = `W${p2Code}`;

  // Helper to extract team innings score
  const getTeamScore = (match: any, teamId: string | undefined) => {
    if (!match || !teamId) return null;
    const inn = (match.innings || []).find((i: any) => i.battingTeamId === teamId && !i.isSuperOver);
    if (!inn) return null;
    return `${inn.runs}/${inn.wickets}${inn.overs != null ? ` (${inn.overs}.${inn.balls || 0})` : ''}`;
  };

  // Render a single team row in a match card (clean, without duplicate chevrons)
  const renderTeamRow = (
    team: any,
    fallbackText: string,
    seedTag: string,
    isWinner: boolean,
    scoreText: string | null,
    isFinal: boolean = false
  ) => {
    const logoUrl = team?.logoUrl ? normalizeImageUrl(team.logoUrl) : null;

    return (
      <div
        className={`${styles.teamRow} ${
          isFinal && isWinner ? styles.teamRowFinalWinner : isWinner ? styles.teamRowWinner : ''
        }`}
        style={{
          height: '36px',
          boxSizing: 'border-box',
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <span
            style={{
              padding: '2px 5px',
              borderRadius: '4px',
              background: isWinner
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(255, 255, 255, 0.08)',
              color: isWinner ? '#10B981' : 'rgba(255, 255, 255, 0.6)',
              fontFamily: 'var(--font-data)',
              fontWeight: 800,
              fontSize: '0.68rem',
              flexShrink: 0,
            }}
          >
            {seedTag}
          </span>

          {logoUrl ? (
            <img
              src={logoUrl}
              alt={team?.name || 'Team'}
              referrerPolicy="no-referrer"
              style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 900,
                color: 'rgba(255,255,255,0.7)',
                flexShrink: 0,
              }}
            >
              {team?.shortName?.[0] || 'T'}
            </div>
          )}

          <span
            style={{
              fontWeight: isWinner ? 800 : 600,
              fontSize: '0.86rem',
              color: isWinner ? (isFinal ? '#FFD700' : '#FFFFFF') : team ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {team?.name || fallbackText}
          </span>

          {isWinner && (
            <span style={{ color: isFinal ? '#FFD700' : '#10B981', fontSize: '0.8rem', fontWeight: 900, flexShrink: 0 }}>
              {isFinal ? '👑' : '✓'}
            </span>
          )}
        </div>

        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.82rem',
            fontWeight: 800,
            color: isWinner ? '#FFB800' : 'rgba(255, 255, 255, 0.6)',
            marginLeft: '8px',
            flexShrink: 0,
          }}
        >
          {scoreText || '—'}
        </span>
      </div>
    );
  };

  // Render a match node card
  const renderMatchCard = (
    match: any,
    matchCode: string,
    roundTitle: string,
    teamA: any,
    teamAFallback: string,
    teamASeed: string,
    teamAWon: boolean,
    teamB: any,
    teamBFallback: string,
    teamBSeed: string,
    teamBWon: boolean,
    winnerAdvancementText: string,
    accentColor: string,
    isGrandFinal: boolean = false
  ) => {
    const isLive = match?.status === 'LIVE';
    const isCompleted = match?.status === 'COMPLETED';
    const scoreA = getTeamScore(match, teamA?.id || match?.teamAId);
    const scoreB = getTeamScore(match, teamB?.id || match?.teamBId);

    return (
      <div
        className={`${styles.matchNodeCard} ${
          isLive ? styles.matchNodeLive : isGrandFinal ? styles.matchNodeFinal : ''
        }`}
        style={{
          height: '172px',
          boxSizing: 'border-box',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Match Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '20px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentColor }} />
            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '0.72rem',
                fontWeight: 900,
                color: accentColor,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {matchCode} · {roundTitle}
            </span>
          </div>

          <span
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: '0.66rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              background: isLive
                ? '#EF4444'
                : isCompleted
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(255, 255, 255, 0.06)',
              color: isLive ? '#FFFFFF' : isCompleted ? '#10B981' : 'rgba(255, 255, 255, 0.6)',
              textTransform: 'uppercase',
            }}
          >
            {isLive ? '● LIVE' : match?.status || 'SCHEDULED'}
          </span>
        </div>

        {/* Team Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {renderTeamRow(teamA, teamAFallback, teamASeed, teamAWon, scoreA, isGrandFinal)}
          {renderTeamRow(teamB, teamBFallback, teamBSeed, teamBWon, scoreB, isGrandFinal)}
        </div>

        {/* Card Footer: Advancement Note & Scorecard link */}
        <div
          style={{
            marginTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            paddingTop: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            height: '20px',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              fontSize: '0.68rem',
              color: teamAWon || teamBWon ? '#10B981' : 'rgba(255, 255, 255, 0.5)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {winnerAdvancementText}
          </span>

          {match?.id && (
            <Link
              href={`/scorecard?matchId=${match.id}`}
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#FFB800',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                flexShrink: 0,
              }}
            >
              <span>SCORECARD</span>
              <span>→</span>
            </Link>
          )}
        </div>
      </div>
    );
  };

  // Render the canonical 5-arrow connected bracket circuit
  const renderConnectedBracketTree = () => (
    <div className={styles.bracketTreeDesktop}>
      {/* COLUMN 1: ROUND 1 (PLAYOFF SEMIS - M12 Top, M13 Bottom) */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', marginBottom: '10px', height: '24px' }}>
          <span>ROUND 1</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>//</span>
          <span style={{ color: 'var(--color-accent, #C0272D)' }}>PLAYOFF SEMIS</span>
        </div>

        {/* Qualifier 1 / Playoff 1 */}
        <div style={{ height: '172px', marginBottom: '24px' }}>
          {renderMatchCard(
            q1,
            p1Code,
            'QUALIFIER 1',
            q1?.teamA || seed1,
            'TBD (Seed #1)',
            '#1',
            Boolean(q1Winner && q1Winner.id === (q1?.teamAId || seed1?.id)),
            q1?.teamB || seed2,
            'TBD (Seed #2)',
            '#2',
            Boolean(q1Winner && q1Winner.id === (q1?.teamBId || seed2?.id)),
            q1Winner ? `✓ ${q1Winner.shortName || q1Winner.name} → Grand Final` : `Winner → Final · Loser → ${p3Code}`,
            '#C0272D'
          )}
        </div>

        {/* Eliminator / Playoff 2 */}
        <div style={{ height: '172px' }}>
          {renderMatchCard(
            elim,
            p2Code,
            'ELIMINATOR',
            elim?.teamA || seed3,
            seed3Fallback,
            seed3Tag,
            Boolean(elimWinner && elimWinner.id === (elim?.teamAId || seed3?.id)),
            elim?.teamB || seed4,
            seed4Fallback,
            seed4Tag,
            Boolean(elimWinner && elimWinner.id === (elim?.teamBId || seed4?.id)),
            elimWinner ? `✓ ${elimWinner.shortName || elimWinner.name} → ${p3Code}` : `Winner → ${p3Code} · Loser Out`,
            '#FFB800'
          )}
        </div>
      </div>

      {/* COLUMN 2: CHANNEL 1 (Between Round 1 and Round 2) */}
      <div className={styles.connectorChannel} style={{ position: 'relative', width: '48px', height: '100%' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '48px', height: '440px', overflow: 'visible' }}>
          {/* Dark Contrast Underlays */}
          <path d="M 0 96 H 48" fill="none" stroke="#07080B" strokeWidth="6" strokeLinecap="square" />
          <path d="M 0 138 H 24 V 292 H 38" fill="none" stroke="#07080B" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" />
          <path d="M 0 334 H 38" fill="none" stroke="#07080B" strokeWidth="6" strokeLinecap="square" />

          {/* Path 1: M12 Winner direct line across top at y=96 (Pass-through to Expressway, NO arrow here) */}
          <path
            d="M 0 96 H 48"
            fill="none"
            stroke={q1Winner ? '#10B981' : 'rgba(255, 255, 255, 0.2)'}
            strokeWidth="3"
            strokeLinecap="square"
            strokeDasharray={q1Winner ? 'none' : '5 4'}
          />

          {/* Arrow 1: M12 Loser drops down 90-deg to M14 Team A at y=292 */}
          <path
            d="M 0 138 H 24 V 292 H 38"
            fill="none"
            stroke={q1Winner ? '#EF4444' : 'rgba(255, 255, 255, 0.2)'}
            strokeWidth="3"
            strokeLinecap="square"
            strokeLinejoin="miter"
            strokeDasharray={q1Winner ? 'none' : '5 4'}
          />
          <polygon
            points="41,292 33,287 35.5,292 33,297"
            fill={q1Winner ? '#EF4444' : 'rgba(255, 255, 255, 0.3)'}
            filter={q1Winner ? 'drop-shadow(0 0 6px #EF4444)' : 'none'}
          />

          {/* Arrow 2: M13 Winner advances straight into M14 Team B at y=334 */}
          <path
            d="M 0 334 H 38"
            fill="none"
            stroke={elimWinner ? '#10B981' : 'rgba(255, 255, 255, 0.2)'}
            strokeWidth="3"
            strokeLinecap="square"
            strokeDasharray={elimWinner ? 'none' : '5 4'}
          />
          <polygon
            points="41,334 33,329 35.5,334 33,339"
            fill={elimWinner ? '#10B981' : 'rgba(255, 255, 255, 0.3)'}
            filter={elimWinner ? 'drop-shadow(0 0 6px #10B981)' : 'none'}
          />
        </svg>
      </div>

      {/* COLUMN 3: ROUND 2 (Expressway Corridor Top, M14 Qualifier 2 Bottom) */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', marginBottom: '10px', height: '24px' }}>
          <span>ROUND 2</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>//</span>
          <span style={{ color: '#FFB800' }}>FINAL QUALIFIER</span>
        </div>

        {/* TOP ROW: Q1 Winner Express Corridor (Traverses across Column 3 seamlessly at Y=96px) */}
        <div style={{ height: '172px', position: 'relative', width: '100%', marginBottom: '24px' }}>
          {/* Single continuous line passing through Column 3 at exactly Y=96px (62px from top of container) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '62px',
              height: '3px',
              transform: 'translateY(-50%)',
              background: q1Winner ? '#10B981' : 'rgba(255, 255, 255, 0.2)',
              boxShadow: q1Winner ? '0 0 10px rgba(16, 185, 129, 0.6)' : 'none',
              zIndex: 1,
            }}
          />

          {/* Centered Route Telemetry Badge (Dead-center on the line at Y=96px) */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '62px',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              borderRadius: '9999px',
              background: '#0B0B10',
              border: `1.5px solid ${q1Winner ? '#10B981' : 'rgba(255, 255, 255, 0.16)'}`,
              boxShadow: q1Winner ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none',
              fontFamily: 'var(--font-data)',
              fontSize: '0.66rem',
              fontWeight: 900,
              color: q1Winner ? '#10B981' : 'rgba(255, 255, 255, 0.65)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: q1Winner ? '#10B981' : 'rgba(255, 255, 255, 0.3)', flexShrink: 0 }} />
            <span>Q1 WINNER ➔ GRAND FINAL DIRECT ADVANCE</span>
          </div>
        </div>

        {/* BOTTOM ROW: Qualifier 2 / Playoff 3 */}
        <div style={{ height: '172px' }}>
          {renderMatchCard(
            q2,
            p3Code,
            'QUALIFIER 2',
            q2?.teamA || q1Loser,
            p3FallbackA,
            p3TagA,
            Boolean(q2Winner && q2Winner.id === (q2?.teamAId || q1Loser?.id)),
            q2?.teamB || elimWinner,
            p3FallbackB,
            p3TagB,
            Boolean(q2Winner && q2Winner.id === (q2?.teamBId || elimWinner?.id)),
            q2Winner ? `✓ ${q2Winner.shortName || q2Winner.name} → Grand Final` : 'Winner → Final · Loser Out',
            '#FFB800'
          )}
        </div>
      </div>

      {/* COLUMN 4: CHANNEL 2 (Between Round 2 and Round 3) */}
      <div className={styles.connectorChannel} style={{ position: 'relative', width: '48px', height: '100%' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '48px', height: '440px', overflow: 'visible' }}>
          {/* Dark Contrast Underlays */}
          <path d="M 0 96 H 38" fill="none" stroke="#07080B" strokeWidth="6" strokeLinecap="square" />
          <path d="M 0 313 H 24 V 138 H 38" fill="none" stroke="#07080B" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" />

          {/* Arrow 3: Q1 Winner direct line enters Final Team A at y=96 */}
          <path
            d="M 0 96 H 38"
            fill="none"
            stroke={q1Winner ? '#10B981' : 'rgba(255, 255, 255, 0.2)'}
            strokeWidth="3"
            strokeLinecap="square"
            strokeDasharray={q1Winner ? 'none' : '5 4'}
          />
          <polygon
            points="41,96 33,91 35.5,96 33,101"
            fill={q1Winner ? '#10B981' : 'rgba(255, 255, 255, 0.3)'}
            filter={q1Winner ? 'drop-shadow(0 0 6px #10B981)' : 'none'}
          />

          {/* Arrow 4: Q2 Winner rises up from y=313 to Final Team B at y=138 */}
          <path
            d="M 0 313 H 24 V 138 H 38"
            fill="none"
            stroke={q2Winner ? '#10B981' : 'rgba(255, 255, 255, 0.2)'}
            strokeWidth="3"
            strokeLinecap="square"
            strokeDasharray={q2Winner ? 'none' : '5 4'}
          />
          <polygon
            points="41,138 33,133 35.5,138 33,143"
            fill={q2Winner ? '#10B981' : 'rgba(255, 255, 255, 0.3)'}
            filter={q2Winner ? 'drop-shadow(0 0 6px #10B981)' : 'none'}
          />
        </svg>
      </div>

      {/* COLUMN 5: ROUND 3 (Grand Final Top, Championship Telemetry Bottom) */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFD700', letterSpacing: '0.08em', marginBottom: '10px', height: '24px' }}>
          <span>STAGE 4</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>//</span>
          <span>GRAND FINAL</span>
        </div>

        {/* Grand Final at Y=34px, Team A at Y=96px */}
        <div style={{ height: '172px', marginBottom: '24px' }}>
          {renderMatchCard(
            finalMatch,
            finalCode,
            'GRAND FINAL',
            finalMatch?.teamA || q1Winner,
            `TBD (Winner ${p1Code})`,
            `W${p1Code}`,
            Boolean(crownedChampion && crownedChampion.id === (finalMatch?.teamAId || q1Winner?.id)),
            finalMatch?.teamB || q2Winner,
            `TBD (Winner ${p3Code})`,
            `W${p3Code}`,
            Boolean(crownedChampion && crownedChampion.id === (finalMatch?.teamBId || q2Winner?.id)),
            crownedChampion ? `👑 Champion: ${crownedChampion.name}` : 'Decides Tournament Champion',
            '#FFD700',
            true
          )}
        </div>

        {/* BOTTOM ROW: Playoff Telemetry Card at Y=230px */}
        <div
          style={{
            height: '172px',
            boxSizing: 'border-box',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            CHAMPIONSHIP FORMAT
          </div>
          <div style={{ fontSize: '0.82rem', color: '#FFF', fontWeight: 700 }}>
            Best of 1 Knockout Final
          </div>
          <p style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4 }}>
            Winner of M15 is crowned Computing Premier League 2026 Champion. Trophy presented immediately on field.
          </p>
        </div>
      </div>

      {/* COLUMN 6: CHANNEL 3 (Between Grand Final and Trophy Podium) */}
      <div className={styles.connectorChannel} style={{ position: 'relative', width: '48px', height: '100%' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '48px', height: '440px', overflow: 'visible' }}>
          <path d="M 0 117 H 38" fill="none" stroke="#07080B" strokeWidth="6" strokeLinecap="square" />
          {/* Arrow 5: Grand Final Winner straight into Champion Trophy Podium (Exactly ONE arrow at Y=117) */}
          <path
            d="M 0 117 H 38"
            fill="none"
            stroke={crownedChampion ? '#FFB800' : 'rgba(255, 255, 255, 0.2)'}
            strokeWidth="3.5"
            strokeLinecap="square"
            strokeDasharray={crownedChampion ? 'none' : '5 4'}
          />
          <polygon
            points="41,117 33,111 35.5,117 33,123"
            fill={crownedChampion ? '#FFB800' : 'rgba(255, 255, 255, 0.3)'}
            filter={crownedChampion ? 'drop-shadow(0 0 8px #FFB800)' : 'none'}
          />
        </svg>
      </div>

      {/* COLUMN 7: CHAMPION TROPHY PODIUM (Directly aligned with M15) */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFD700', letterSpacing: '0.08em', marginBottom: '10px', height: '24px' }}>
          <span>HONOURS</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>//</span>
          <span>2026 TITLE</span>
        </div>

        {/* Row 1: Champion Podium at Y=34px, center at Y=117px */}
        <div style={{ height: '172px', marginBottom: '24px' }}>
          <div className={styles.championPodium}>
            <div style={{ color: '#FFD700', marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                <path d="M18 4H6v7a6 6 0 0 0 12 0V4Z" />
              </svg>
            </div>

            <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFD700', letterSpacing: '0.12em', marginBottom: '2px' }}>
              CPL 2026 CHAMPION
            </div>

            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                color: crownedChampion ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                margin: '2px 0',
                lineHeight: 1.1,
              }}
            >
              {crownedChampion ? crownedChampion.name : 'Awaiting Final'}
            </h3>

            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', margin: '2px 0 0', lineHeight: 1.3 }}>
              {crownedChampion ? 'Winner of Computing Premier League 2026' : 'Winner of Match 15 Claims the Cup'}
            </p>
          </div>
        </div>

        {/* Row 2: Playoff Honours Card at Y=230px */}
        <div
          style={{
            height: '172px',
            boxSizing: 'border-box',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            HONOURS ROSTER
          </div>
          <div style={{ fontSize: '0.82rem', color: '#FFF', fontWeight: 700 }}>
            Gold & Silver Podiums
          </div>
          <p style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4 }}>
            Champions & Runners-up medals awarded post-match at Faculty grounds.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <section id="bracket" style={{ marginBottom: '56px', scrollMarginTop: '90px' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ width: '8px', height: '2px', background: '#FFB800' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#FFB800' }}>
              Stage 3 & 4 Knockout Phase
            </span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Championship <span style={{ color: 'var(--color-accent, #C0272D)' }}>Playoff Bracket</span>
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.6)', margin: '4px 0 0', maxWidth: '680px' }}>
            Official Page-McIntyre playoff bracket with double-chance advantage for Seeds #1 & #2. Winner of Qualifier 1 advances straight to the Grand Final; Lower Bracket battles through Qualifier 2.
          </p>
        </div>

        {/* Stage Badge */}
        <div className={styles.telemetryBadge}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>ACTIVE:</span>
          <strong style={{ color: '#FFB800' }}>{progress.currentStage}</strong>
        </div>
      </div>

      {/* Seeding Command HUD (Compact 2x2 on mobile, 4-col on desktop) */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', marginBottom: '8px' }}>
          Four-Team Playoff Seeding Allocation
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { seed: '#1', team: seed1, label: is6Team ? 'Group A Winner' : is7Team ? 'Group A 1st' : 'Playoff Seed 1', dest: `→ ${p1Code}`, color: '#10B981' },
            { seed: '#2', team: seed2, label: is6Team ? 'Group B Winner' : is7Team ? 'Group B 1st' : 'Playoff Seed 2', dest: `→ ${p1Code}`, color: '#10B981' },
            { seed: '#3', team: seed3, label: is6Team ? 'Winner WC1 (M07)' : is7Team ? 'Group A 2nd' : 'Playoff Seed 3', dest: `→ ${p2Code}`, color: '#FFB800' },
            { seed: '#4', team: seed4, label: is6Team ? 'Winner WC3 (M09)' : is7Team ? 'Group B 2nd' : 'Playoff Seed 4', dest: `→ ${p2Code}`, color: '#FFB800' },
          ].map((s) => (
            <div
              key={s.seed}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    padding: '2px 5px',
                    borderRadius: '4px',
                    background: s.color,
                    color: '#0B0B10',
                    fontFamily: 'var(--font-data)',
                    fontWeight: 900,
                    fontSize: '0.68rem',
                    flexShrink: 0,
                  }}
                >
                  {s.seed}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.78rem', color: s.team ? '#FFF' : 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.team ? s.team.name : `TBD (${s.label})`}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </div>
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.68rem', color: s.color, fontWeight: 800, flexShrink: 0 }}>
                {s.dest}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Stage Selector Tabs (visible below 1024px) */}
      <div className="flex lg:hidden items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {[
          { key: 'R1', label: `1. Semis (${p1Code}/${p2Code})` },
          { key: 'R2', label: `2. Qual 2 (${p3Code})` },
          { key: 'R3', label: `3. Grand Final (${finalCode})` },
          { key: 'PODIUM', label: '🏆 Honours' },
          { key: 'ALL', label: '🌐 Full Circuit Tree' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMobileRoundTab(tab.key as any)}
            className={`${styles.mobileTabPill} ${mobileRoundTab === tab.key ? styles.mobileTabPillActive : ''}`}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP CONNECTED BRACKET TREE (≥ 1024px)                                 */}
      {/* EXACTLY 5 ARROWS: Clean, Straight, Non-Overlapping Circuit Paths           */}
      {/* ========================================================================= */}
      <div className="hidden lg:block">
        {renderConnectedBracketTree()}
      </div>

      {/* ========================================================================= */}
      {/* MOBILE / RESPONSIVE BRACKET VIEW (< 1024px)                               */}
      {/* ========================================================================= */}
      <div className="block lg:hidden">
        {mobileRoundTab === 'ALL' ? (
          /* Smooth Horizontal Panoramic Canvas with Complete Connected Circuit */
          <div className={styles.mobileTreePanoramicCanvas}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '6px 14px',
                background: 'rgba(255, 184, 0, 0.08)',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 184, 0, 0.25)',
                width: 'fit-content',
                margin: '0 auto 14px',
                fontFamily: 'var(--font-data)',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#FFB800',
                letterSpacing: '0.04em',
              }}
            >
              <span>⇄</span>
              <span>PAN HORIZONTALLY TO TRACE FULL CIRCUIT & ARROWS</span>
            </div>
            <div style={{ minWidth: '1040px' }}>
              {renderConnectedBracketTree()}
            </div>
          </div>
        ) : (
          /* Focused Stage Tabs with High-Tech Advancement Badges */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mobileRoundTab === 'R1' && (
              <>
                <div>
                  {renderMatchCard(
                    q1,
                    p1Code,
                    'QUALIFIER 1',
                    q1?.teamA || seed1,
                    'TBD (Seed #1)',
                    '#1',
                    Boolean(q1Winner && q1Winner.id === (q1?.teamAId || seed1?.id)),
                    q1?.teamB || seed2,
                    'TBD (Seed #2)',
                    '#2',
                    Boolean(q1Winner && q1Winner.id === (q1?.teamBId || seed2?.id)),
                    q1Winner ? `✓ ${q1Winner.shortName || q1Winner.name} → Final` : `Winner → Final · Loser → ${p3Code}`,
                    '#C0272D'
                  )}
                  <div className={`${styles.mobileAdvancementBadge} ${styles.mobileAdvancementBadgeEmerald}`}>
                    <span>➔</span>
                    <span>WINNER ADVANCES DIRECTLY TO GRAND FINAL ({finalCode})</span>
                  </div>
                  <div className={`${styles.mobileAdvancementBadge} ${styles.mobileAdvancementBadgeAmber}`}>
                    <span>➔</span>
                    <span>LOSER TO QUALIFIER 2 ({p3Code}) · DOUBLE CHANCE</span>
                  </div>
                </div>

                <div>
                  {renderMatchCard(
                    elim,
                    p2Code,
                    'ELIMINATOR',
                    elim?.teamA || seed3,
                    seed3Fallback,
                    seed3Tag,
                    Boolean(elimWinner && elimWinner.id === (elim?.teamAId || seed3?.id)),
                    elim?.teamB || seed4,
                    seed4Fallback,
                    seed4Tag,
                    Boolean(elimWinner && elimWinner.id === (elim?.teamBId || seed4?.id)),
                    elimWinner ? `✓ ${elimWinner.shortName || elimWinner.name} → ${p3Code}` : `Winner → ${p3Code} · Loser Out`,
                    '#FFB800'
                  )}
                  <div className={`${styles.mobileAdvancementBadge} ${styles.mobileAdvancementBadgeAmber}`}>
                    <span>➔</span>
                    <span>WINNER ADVANCES TO QUALIFIER 2 ({p3Code})</span>
                  </div>
                  <div className={`${styles.mobileAdvancementBadge} ${styles.mobileAdvancementBadgeRose}`}>
                    <span>✖</span>
                    <span>LOSER IS ELIMINATED (4TH PLACE)</span>
                  </div>
                </div>
              </>
            )}

            {mobileRoundTab === 'R2' && (
              <div>
                {renderMatchCard(
                  q2,
                  p3Code,
                  'QUALIFIER 2',
                  q2?.teamA || q1Loser,
                  p3FallbackA,
                  p3TagA,
                  Boolean(q2Winner && q2Winner.id === (q2?.teamAId || q1Loser?.id)),
                  q2?.teamB || elimWinner,
                  p3FallbackB,
                  p3TagB,
                  Boolean(q2Winner && q2Winner.id === (q2?.teamBId || elimWinner?.id)),
                  q2Winner ? `✓ ${q2Winner.shortName || q2Winner.name} → Final` : 'Winner → Final · Loser Out',
                  '#FFB800'
                )}
                <div className={`${styles.mobileAdvancementBadge} ${styles.mobileAdvancementBadgeGold}`}>
                  <span>➔</span>
                  <span>WINNER ADVANCES TO GRAND FINAL ({finalCode})</span>
                </div>
                <div className={`${styles.mobileAdvancementBadge} ${styles.mobileAdvancementBadgeRose}`}>
                  <span>✖</span>
                  <span>LOSER IS ELIMINATED (3RD PLACE PODIUM)</span>
                </div>
              </div>
            )}

            {mobileRoundTab === 'R3' && (
              <div>
                {renderMatchCard(
                  finalMatch,
                  finalCode,
                  'GRAND FINAL',
                  finalMatch?.teamA || q1Winner,
                  `TBD (Winner ${p1Code})`,
                  `W${p1Code}`,
                  Boolean(crownedChampion && crownedChampion.id === (finalMatch?.teamAId || q1Winner?.id)),
                  finalMatch?.teamB || q2Winner,
                  `TBD (Winner ${p3Code})`,
                  `W${p3Code}`,
                  Boolean(crownedChampion && crownedChampion.id === (finalMatch?.teamBId || q2Winner?.id)),
                  crownedChampion ? `👑 Champion: ${crownedChampion.name}` : 'Decides Tournament Champion',
                  '#FFD700',
                  true
                )}
                <div className={`${styles.mobileAdvancementBadge} ${styles.mobileAdvancementBadgeGold}`}>
                  <span>👑</span>
                  <span>WINNER: TOURNAMENT CHAMPION</span>
                </div>
                <div className={`${styles.mobileAdvancementBadge} ${styles.mobileAdvancementBadgeSilver}`}>
                  <span>🥈</span>
                  <span>RUNNER-UP: SILVER MEDALIST</span>
                </div>
              </div>
            )}

            {mobileRoundTab === 'PODIUM' && (
              <div className={styles.championPodium}>
                <div style={{ color: '#FFD700', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                    <path d="M18 4H6v7a6 6 0 0 0 12 0V4Z" />
                  </svg>
                </div>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.74rem', fontWeight: 900, color: '#FFD700', marginBottom: '4px' }}>
                  CPL 2026 CHAMPION
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, color: crownedChampion ? '#FFF' : 'rgba(255,255,255,0.4)', margin: 0 }}>
                  {crownedChampion ? crownedChampion.name : 'Awaiting Grand Final Result'}
                </h3>
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'left' }}>
                  <div style={{ background: 'rgba(255, 215, 0, 0.05)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255, 215, 0, 0.15)' }}>
                    <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.64rem', color: '#FFD700', fontWeight: 800 }}>GOLD PODIUM</div>
                    <div style={{ fontSize: '0.78rem', color: '#FFF', fontWeight: 700 }}>Winner M15</div>
                  </div>
                  <div style={{ background: 'rgba(148, 163, 184, 0.05)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.64rem', color: '#94A3B8', fontWeight: 800 }}>SILVER PODIUM</div>
                    <div style={{ fontSize: '0.78rem', color: '#FFF', fontWeight: 700 }}>Runner-up M15</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
