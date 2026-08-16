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
      value: tournamentConfig.venue || 'Coming Soon',
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
                alignItems: 'start',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '4px', letterSpacing: '0.08em' }}>
                  Tournament Date
                </span>
                <p style={{ fontFamily: 'var(--font-data)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {tournamentConfig.date || 'TBA'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '4px', letterSpacing: '0.08em' }}>
                  Reporting Time
                </span>
                <p style={{ fontFamily: 'var(--font-data)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {tournamentConfig.time || 'TBA'}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginTop: '2px', display: 'block' }}>
                  Check-in & briefing
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '4px', letterSpacing: '0.08em' }}>
                  Venue & Ground
                </span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0, lineHeight: 1.3 }}>
                  {tournamentConfig.venue || 'Coming Soon'}
                </p>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px dashed var(--color-border)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                * Final fixture schedules and pitch allocations will be shared with registered team captains via the official WhatsApp group.
              </span>
            </div>
          </div>

          {/* Secondary Specifications: Horizontally Aligned 3-Column Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
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

          {/* Dedicated Match Arena & Live Venue Map Showcase (Hallmark Sport Theme) */}
          <div
            id="arena-map"
            style={{
              background: 'var(--color-paper-card)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
              marginTop: '8px',
            }}
          >
            <style>{`
              .arena-map-grid {
                display: grid;
                grid-template-columns: 1fr;
              }
              .arena-logistics-col {
                padding: 20px 16px;
                border-bottom: 1px solid var(--color-border);
              }
              .arena-map-frame {
                position: relative;
                min-height: 240px;
                height: 260px;
                width: 100%;
                background: #11141B;
                overflow: hidden;
              }
              @media (min-width: 768px) {
                .arena-map-grid {
                  grid-template-columns: 1fr 1.15fr;
                }
                .arena-logistics-col {
                  padding: var(--space-xl);
                  border-bottom: none;
                  border-right: 1px solid var(--color-border);
                }
                .arena-map-frame {
                  min-height: 380px;
                  height: 100%;
                }
              }
            `}</style>

            {/* Top Bar Header */}
            <div
              style={{
                padding: 'clamp(14px, 3vw, 20px) clamp(16px, 4vw, 32px)',
                background: 'var(--color-paper-alt)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--color-accent)',
                    }}
                    className="animate-pulse-dot"
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--color-accent)',
                    }}
                  >
                    Official Match Ground
                  </span>
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.25rem, 4.5vw, 1.65rem)',
                    fontWeight: 900,
                    color: 'var(--color-ink)',
                    textTransform: 'uppercase',
                    margin: 0,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.15,
                  }}
                >
                  Ratmalana CGR Ground <span style={{ color: 'var(--color-ink-muted)', fontWeight: 600, fontSize: 'clamp(0.88rem, 2.5vw, 1.1rem)' }}>(Ratmalana United S.C)</span>
                </h3>
              </div>

              {tournamentConfig.venueMapUrl && (
                <a
                  href={tournamentConfig.venueMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-hallmark-primary"
                  style={{
                    padding: '0 16px',
                    height: '38px',
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}
                >
                  <span>Open in Google Maps</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </a>
              )}
            </div>

            {/* Split Grid: Ground Logistics & Embedded Live Map */}
            <div className="arena-map-grid">
              {/* Left Column: Logistics & Facilities */}
              <div
                className="arena-logistics-col"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 'var(--space-md)',
                  background: 'var(--color-paper-card)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Item 1: Landmark */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-accent-soft)',
                        color: 'var(--color-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '1px', letterSpacing: '0.08em' }}>
                        Location & Address
                      </span>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                        Station Road, Ratmalana
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', lineHeight: 1.4, display: 'block' }}>
                        Adjacent to Ratmalana Railway Grounds & Angulana
                      </span>
                    </div>
                  </div>

                  {/* Item 2: Schedule & Timings */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-accent-soft)',
                        color: 'var(--color-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '1px', letterSpacing: '0.08em' }}>
                        Reporting Schedule
                      </span>
                      <p style={{ fontFamily: 'var(--font-data)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                        08:00 AM Match Start
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', lineHeight: 1.4, display: 'block' }}>
                        Gates open 07:00 AM · Captains briefing 07:45 AM
                      </span>
                    </div>
                  </div>

                  {/* Item 3: Ground Facilities */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-accent-soft)',
                        color: 'var(--color-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '1px', letterSpacing: '0.08em' }}>
                        Arena Facilities
                      </span>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                        Turf Pitch & Pavilion Dugouts
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', lineHeight: 1.4, display: 'block' }}>
                        Dedicated team benches, spectator stands & parking zones
                      </span>
                    </div>
                  </div>

                  {/* Item 4: Transit & Arrival */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-accent-soft)',
                        color: 'var(--color-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="3 11 22 2 13 21 11 13 3 11" />
                      </svg>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', display: 'block', marginBottom: '1px', letterSpacing: '0.08em' }}>
                        Transit & Access
                      </span>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                        Galle Road & Railway
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', lineHeight: 1.4, display: 'block' }}>
                        Direct entry via Maliban Jct · 3-min walk from Ratmalana Station
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Custom Framed Embedded Google Map */}
              <div className="arena-map-frame">
                {/* Map Iframe */}
                <iframe
                  title="Ratmalana CGR Ground Map"
                  src={tournamentConfig.venueEmbedUrl || "https://maps.google.com/maps?q=Ratmalana+CGR+Ground+(Ratmalana+United+S.C)&t=&z=15&ie=UTF8&iwloc=&output=embed"}
                  width="100%"
                  height="100%"
                  style={{
                    border: 0,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                  }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />

                {/* Floating Map Watermark Badge (Hallmark Clean Pill) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-pill)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--color-ink)',
                    border: '1px solid var(--color-border)',
                    pointerEvents: 'none',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)' }} />
                  Ratmalana United S.C. Ground
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
