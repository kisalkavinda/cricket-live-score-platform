'use client';

import styles from '../tournament.module.css';

interface TournamentHeroHUDProps {
  progress: {
    totalMatches: number;
    completedMatches: number;
    currentStage: 'GROUP' | 'QUALIFICATION' | 'PLAYOFFS' | 'FINAL' | 'COMPLETED';
  };
  liveMatch: any;
  lastRefreshed: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  crownedChampion: any;
}

export default function TournamentHeroHUD({
  progress,
  liveMatch,
  lastRefreshed,
  isRefreshing,
  onRefresh,
  crownedChampion,
}: TournamentHeroHUDProps) {
  const stageOrder = ['GROUP', 'QUALIFICATION', 'PLAYOFFS', 'FINAL', 'COMPLETED'];
  const currentStageIdx = stageOrder.indexOf(progress.currentStage);
  const percentComplete = Math.min(100, Math.round((progress.completedMatches / (progress.totalMatches || 15)) * 100));

  const stages = [
    { id: 'GROUP', label: '1. Group Stage', matchCode: 'M01–M08', desc: '8 Teams in 2 Groups' },
    { id: 'QUALIFICATION', label: '2. Qualifiers', matchCode: 'M09–M11', desc: 'Bridge to Playoff' },
    { id: 'PLAYOFFS', label: '3. Playoffs', matchCode: 'M12–M14', desc: 'Page-McIntyre 4 Teams' },
    { id: 'FINAL', label: '4. Grand Final', matchCode: 'M15', desc: 'Championship Decider' },
  ];

  return (
    <section style={{ marginBottom: '32px' }}>
      {/* Crowned Champion Banner (if tournament concluded or champion determined) */}
      {crownedChampion && (
        <div
          style={{
            marginBottom: '24px',
            padding: '18px 20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.2) 0%, rgba(192, 39, 45, 0.15) 100%)',
            border: '1.5px solid rgba(255, 184, 0, 0.5)',
            boxShadow: '0 0 35px rgba(255, 184, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0B0B10',
                boxShadow: '0 4px 20px rgba(255, 215, 0, 0.5)',
                flexShrink: 0,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                <path d="M18 4H6v7a6 6 0 0 0 12 0V4Z" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#FFB800' }}>
                CPL 2026 Champion Crowned
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.6rem, 5vw, 3.4rem)',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  margin: '2px 0 0',
                  lineHeight: 1.05,
                  letterSpacing: '-0.01em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {crownedChampion.name}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Official Tournament Winner at Ratmalana Ground.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '5px 12px',
              borderRadius: '9999px',
              background: 'rgba(255, 184, 0, 0.15)',
              border: '1px solid rgba(255, 184, 0, 0.4)',
              color: '#FFB800',
              fontFamily: 'var(--font-data)',
              fontWeight: 800,
              fontSize: '0.74rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            TOURNAMENT CONCLUDED
          </div>
        </div>
      )}

      {/* Main Title & Operation Status Bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ width: '12px', height: '2px', background: 'var(--color-accent, #C0272D)' }} />
            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                color: 'var(--color-accent, #C0272D)',
              }}
            >
              Tournament Command Network
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 0.96,
              letterSpacing: '-0.02em',
            }}
          >
            Championship <span style={{ color: 'var(--color-accent, #C0272D)' }}>Hub</span>
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '8px', marginBottom: 0, maxWidth: '640px', lineHeight: 1.45 }}>
            Live match tracking, authoritative playoff bracket, group standings, and softball Net Run Rate (NRR) telemetry.
          </p>
        </div>

        {/* Telemetry & Refresh Badges */}
        <div className="flex flex-col items-start md:items-end gap-2.5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Live / Stage Badge */}
            <div
              className={styles.telemetryBadge}
              style={{
                borderColor: liveMatch
                  ? 'rgba(239, 68, 68, 0.4)'
                  : progress.currentStage === 'COMPLETED'
                  ? 'rgba(16, 185, 129, 0.4)'
                  : 'rgba(255, 184, 0, 0.4)',
                background: liveMatch
                  ? 'rgba(239, 68, 68, 0.12)'
                  : progress.currentStage === 'COMPLETED'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(255, 184, 0, 0.12)',
                color: liveMatch ? '#EF4444' : progress.currentStage === 'COMPLETED' ? '#10B981' : '#FFB800',
              }}
            >
              <span
                className={`${styles.beaconDot} ${
                  progress.currentStage === 'COMPLETED'
                    ? styles.beaconDotGreen
                    : liveMatch
                    ? ''
                    : styles.beaconDotGold
                }`}
              />
              <span style={{ fontWeight: 800 }}>
                {liveMatch ? 'MATCH IN PROGRESS' : `STAGE: ${progress.currentStage}`}
              </span>
            </div>

            {/* Matches Progress Pill */}
            <div className={styles.telemetryBadge}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>PROGRESS:</span>
              <strong style={{ color: '#FFFFFF' }}>
                {progress.completedMatches} / {progress.totalMatches}
              </strong>
            </div>
          </div>

          {/* Sync status & Refresh Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.45)', fontFamily: 'var(--font-data)' }}>
            <span>SYNCED {lastRefreshed || 'JUST NOW'}</span>
            <span style={{ opacity: 0.3 }}>•</span>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFB800',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.74rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 4px',
                transition: 'opacity 0.15s ease',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                }}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              <span>{isRefreshing ? 'REFRESHING...' : 'SYNC DATA'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Futuristic Progression Ribbon (4 Stages + Progress Bar) */}
      <div className={styles.cyberPanel} style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>
              Championship Timeline
            </span>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#FFB800', fontFamily: 'var(--font-data)', fontWeight: 800 }}>
            {percentComplete}% COMPLETE ({progress.completedMatches}/{progress.totalMatches} MATCHES)
          </span>
        </div>

        {/* Segmented Progress Track */}
        <div
          style={{
            height: '4px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '9999px',
            overflow: 'hidden',
            marginBottom: '16px',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percentComplete}%`,
              background: 'linear-gradient(90deg, var(--color-accent, #C0272D) 0%, #FFB800 100%)',
              borderRadius: '9999px',
              transition: 'width 0.4s ease-out',
              boxShadow: '0 0 10px rgba(255, 184, 0, 0.5)',
            }}
          />
        </div>

        {/* 4 Stage Cards Grid (Crisp 2x2 on mobile, 4-col on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {stages.map((stage, idx) => {
            const isCompleted = currentStageIdx > idx || progress.currentStage === 'COMPLETED';
            const isCurrent = progress.currentStage === stage.id && progress.currentStage !== 'COMPLETED';

            return (
              <div
                key={stage.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: isCurrent
                    ? 'rgba(192, 39, 45, 0.14)'
                    : isCompleted
                    ? 'rgba(16, 185, 129, 0.05)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: isCurrent
                    ? '1.5px solid var(--color-accent, #C0272D)'
                    : isCompleted
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: isCurrent ? '0 0 16px rgba(192, 39, 45, 0.2)' : 'none',
                  transition: 'all 0.2s ease',
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '4px' }}>
                  <span
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: isCurrent ? '#FFFFFF' : isCompleted ? '#10B981' : 'rgba(255,255,255,0.7)',
                      letterSpacing: '0.02em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {stage.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      background: isCompleted
                        ? 'rgba(16, 185, 129, 0.2)'
                        : isCurrent
                        ? 'var(--color-accent, #C0272D)'
                        : 'rgba(255, 255, 255, 0.06)',
                      color: isCompleted ? '#10B981' : '#FFFFFF',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted ? '✓ Done' : isCurrent ? 'Active' : 'Queued'}
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#FFB800', fontFamily: 'var(--font-data)', fontWeight: 700, marginBottom: '2px' }}>
                  {stage.matchCode}
                </div>
                <div style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stage.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Section Anchor Navigation Bar */}
      <nav className={styles.navHud} aria-label="Tournament Navigation">
        <a href="#bracket" className={styles.navHudLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
            <path d="M18 8h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4" />
            <circle cx="8" cy="12" r="2" />
          </svg>
          <span>Playoff Bracket</span>
        </a>
        <a href="#groups" className={styles.navHudLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          <span>Group Standings</span>
        </a>
        <a href="#qualification" className={styles.navHudLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span>Stage 2 Qualifiers</span>
        </a>
        <a href="#fixtures" className={styles.navHudLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Schedule & Results</span>
        </a>
        <a href="#metrics" className={styles.navHudLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>Telemetry</span>
        </a>
        <a href="#rules" className={styles.navHudLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>Regulations</span>
        </a>
      </nav>
    </section>
  );
}
