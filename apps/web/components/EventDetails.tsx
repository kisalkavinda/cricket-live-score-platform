import { tournamentConfig } from '../config/tournament';

export default function EventDetails() {
  const details = [
    {
      id: 'detail-date',
      title: 'Match Date',
      value: tournamentConfig.date || 'TBA',
      subtitle: 'Official Tournament Day',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      id: 'detail-time',
      title: 'Reporting Time',
      value: tournamentConfig.time || 'TBA',
      subtitle: 'Check-in & Captains Briefing',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      id: 'detail-venue',
      title: 'Stadium Venue',
      value: tournamentConfig.venue ? (
        tournamentConfig.venueMapUrl ? (
          <a
            href={tournamentConfig.venueMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}
          >
            {tournamentConfig.venue}
          </a>
        ) : (
          tournamentConfig.venue
        )
      ) : (
        'Coming Soon'
      ),
      subtitle: 'Location & Grounds',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
    {
      id: 'detail-format',
      title: 'Tournament Format',
      value: tournamentConfig.format || 'League + Knockout',
      subtitle: 'Rules & Match Structure',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      id: 'detail-fee',
      title: 'Entry Registration Fee',
      value: tournamentConfig.entryFee === '[PLACEHOLDER ENTRY FEE]' ? 'Free Entry / University Sponsored' : tournamentConfig.entryFee,
      subtitle: 'Per Team Entry',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      id: 'detail-deadline',
      title: 'Registration Deadline',
      value: tournamentConfig.registrationDeadline || 'TBA',
      subtitle: 'Final Squad Submission',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 16" />
        </svg>
      ),
    },
  ];

  return (
    <section
      id="details"
      style={{
        padding: 'var(--space-3xl) 0',
        background: 'var(--color-paper-alt)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        position: 'relative',
      }}
      aria-label="Event Details"
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 var(--space-md)',
        }}
      >
        {/* Section Header */}
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                width: '12px',
                height: '2px',
                background: 'var(--color-accent)',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-accent)',
              }}
            >
              Key Specifications
            </span>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              color: 'var(--color-ink)',
            }}
          >
            Tournament <span style={{ color: 'var(--color-accent)' }}>Details</span> & Guidelines
          </h2>
        </div>

        {/* Clean Stacked & Horizontally Aligned Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Key Info Feature Card (Full Width Banner) */}
          <div
            style={{
              background: 'var(--color-paper-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-xl)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--space-md)' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-accent-soft)',
                  color: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {details[0].icon}
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    color: 'var(--color-ink)',
                    margin: 0,
                  }}
                >
                  Match Day & Venue Overview
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                  Primary Event Logistics
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-lg)',
                paddingTop: 'var(--space-md)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '4px' }}>
                  Tournament Date
                </span>
                <p style={{ fontFamily: 'var(--font-data)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
                  {details[0].value}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '4px' }}>
                  Reporting Time
                </span>
                <p style={{ fontFamily: 'var(--font-data)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
                  {details[1].value}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '4px' }}>
                  Venue
                </span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                  {details[2].value}
                </p>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px dashed var(--color-border)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                * Final fixture schedules and pitch allocations will be emailed to registered team captains.
              </span>
            </div>
          </div>

          {/* Secondary Specifications: Horizontally Aligned 3-Column Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
            }}
          >
            {details.slice(3).map((item) => (
              <div
                key={item.id}
                id={item.id}
                style={{
                  background: 'var(--color-paper-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                  transition: 'border-color var(--dur-fast)',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-accent-soft)',
                    color: 'var(--color-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--color-ink-subtle)',
                      marginBottom: '4px',
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-data)',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: 'var(--color-ink)',
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
