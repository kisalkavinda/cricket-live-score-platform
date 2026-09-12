'use client';

import styles from '../tournament.module.css';

interface TournamentMetricsGridProps {
  progress: {
    totalMatches: number;
    completedMatches: number;
    currentStage: string;
  };
  highestScoreText: string;
  highestNRRTeam: string;
  tournamentFormat?: string;
  registeredTeamsCount?: number;
}

export default function TournamentMetricsGrid({
  progress,
  highestScoreText,
  highestNRRTeam,
  tournamentFormat,
  registeredTeamsCount,
}: TournamentMetricsGridProps) {
  const remaining = Math.max(0, progress.totalMatches - progress.completedMatches);
  const teamCount = registeredTeamsCount || (tournamentFormat === '6_TEAM' ? 6 : tournamentFormat === '7_TEAM' ? 7 : 8);
  const teamSub = tournamentFormat === '6_TEAM'
    ? 'Groups A & B (3 Teams Each)'
    : tournamentFormat === '7_TEAM'
    ? 'Group A (4) & Group B (3)'
    : 'Groups A & B (4 Teams Each)';

  const metrics = [
    {
      label: 'MATCHES COMPLETED',
      value: `${progress.completedMatches} / ${progress.totalMatches}`,
      sub: `${progress.totalMatches} Scheduled Fixtures`,
      color: 'var(--color-accent, #C0272D)',
    },
    {
      label: 'REMAINING FIXTURES',
      value: String(remaining),
      sub: remaining === 0 ? 'Tournament Concluded' : 'Matches to Champion',
      color: '#FFB800',
    },
    {
      label: 'REGISTERED TEAMS',
      value: `${teamCount} TEAMS`,
      sub: teamSub,
      color: '#FFFFFF',
    },
    {
      label: 'ACTIVE STAGE',
      value: progress.currentStage,
      sub: 'Authoritative Progression',
      color: '#10B981',
    },
    {
      label: 'HIGHEST TEAM TOTAL',
      value: highestScoreText || '—',
      sub: 'Tournament Record Innings',
      color: '#FFB800',
    },
    {
      label: 'TOP NET RUN RATE',
      value: highestNRRTeam || '—',
      sub: 'Best Group Stage NRR',
      color: '#10B981',
    },
  ];

  return (
    <section id="metrics" style={{ marginBottom: '56px', scrollMarginTop: '90px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ width: '8px', height: '2px', background: 'var(--color-accent, #C0272D)' }} />
        <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--color-accent, #C0272D)' }}>
          Telemetry Grid
        </span>
      </div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
          fontWeight: 900,
          textTransform: 'uppercase',
          color: '#FFFFFF',
          margin: '0 0 18px',
        }}
      >
        Tournament <span style={{ color: 'var(--color-accent, #C0272D)' }}>Metrics</span>
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 md:gap-3.5">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className={styles.cyberPanel}
            style={{
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'rgba(255, 255, 255, 0.45)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}
            >
              {m.label}
            </div>

            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 'clamp(1.2rem, 2.5vw, 1.55rem)',
                fontWeight: 900,
                color: m.color,
                lineHeight: 1.1,
                marginBottom: '6px',
                wordBreak: 'break-word',
              }}
            >
              {m.value}
            </div>

            <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.5)' }}>
              {m.sub}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
