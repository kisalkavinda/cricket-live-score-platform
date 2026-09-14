import Link from 'next/link';
import { tournamentConfig } from '../config/tournament';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        background: 'var(--color-paper-dark)',
        color: 'var(--color-paper)',
        borderTop: '2px solid var(--color-accent)',
        paddingTop: 'var(--space-3xl)',
        paddingBottom: 'var(--space-xl)',
        position: 'relative',
      }}
      aria-label="Site Footer"
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 var(--space-md)',
        }}
      >
        {/* Ft5 Statement Footer Archetype */}
        <div style={{ marginBottom: 'var(--space-2xl)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 'var(--space-2xl)' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3rem, 8vw, 6.5rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              lineHeight: 0.9,
              color: 'var(--color-paper)',
              marginBottom: 'var(--space-md)',
              overflowWrap: 'anywhere',
            }}
          >
            {tournamentConfig.name} <span style={{ color: 'var(--color-accent)' }}>CRICKET</span> 2026
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.1rem',
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: '540px',
              lineHeight: 1.5,
            }}
          >
            {tournamentConfig.tagline}
          </p>
        </div>

        {/* Colophon & Navigation Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-xl)',
            marginBottom: 'var(--space-2xl)',
          }}
        >
          {/* Quick Navigation */}
          <div>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-accent-bright)',
                display: 'block',
                marginBottom: 'var(--space-md)',
              }}
            >
              Navigation
            </span>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              <li>
                <Link
                  href="/#overview"
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                  }}
                >
                  Overview & Live Scores
                </Link>
              </li>
              <li>
                <Link
                  href="/#details"
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                  }}
                >
                  Tournament Guidelines
                </Link>
              </li>
              <li>
                <Link
                  href="/rules"
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                  }}
                >
                  📜 Match Rules & Guidelines
                </Link>
              </li>
              <li>
                <Link
                  href="/tournament"
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                  }}
                >
                  Tournament Hub & Draw
                </Link>
              </li>
            </ul>
          </div>

          {/* Event Logistics */}
          <div>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-accent-bright)',
                display: 'block',
                marginBottom: 'var(--space-md)',
              }}
            >
              Event Logistics
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              <p>Match Date: <span style={{ fontFamily: 'var(--font-data)', color: 'var(--color-paper)', fontWeight: 700 }}>{tournamentConfig.date || 'TBA'}</span></p>
              <p>Reporting Time: <span style={{ fontFamily: 'var(--font-data)', color: 'var(--color-paper)', fontWeight: 700 }}>{tournamentConfig.time || 'TBA'}</span></p>
              <p>Venue: <span style={{ color: 'var(--color-paper)', fontWeight: 600 }}>{tournamentConfig.venue || 'TBA'}</span></p>
            </div>
          </div>

          {/* Official Inquiries */}
          {Boolean(tournamentConfig.contactPhones?.length) && (
            <div>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent-bright)',
                  display: 'block',
                  marginBottom: 'var(--space-md)',
                }}
              >
                Helpline & Inquiries
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tournamentConfig.contactPhones.map((phone, idx) => (
                  <a
                    key={idx}
                    href={`tel:${phone.replace(/\s+/g, '')}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-data)',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-bright)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>{phone}</span>
                  </a>
                ))}
                <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-subtle)', marginTop: '2px' }}>
                  Available for team coordination & captain inquiries
                </span>
              </div>
            </div>
          )}

          {/* Captains Notice */}
          <div>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-accent-bright)',
                display: 'block',
                marginBottom: 'var(--space-md)',
              }}
            >
              Captain Briefing
            </span>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              Final fixture schedules and pitch allocations are communicated directly via the official Team Captains WhatsApp group.
            </p>
            {tournamentConfig.venueMapUrl && (
              <a
                href={tournamentConfig.venueMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--color-accent-bright)',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                <span>Ground Directions ↗</span>
              </a>
            )}
          </div>
        </div>

        {/* Bottom Copyright & Hallmark Stamp */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
            paddingTop: 'var(--space-md)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.8rem',
            color: 'var(--color-ink-subtle)',
          }}
        >
          <p>© {currentYear} {tournamentConfig.name} Tournament. All rights reserved.</p>
          <p>
            Created by{' '}
            <a
              href="https://www.linkedin.com/in/kisal-kavinda/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--color-accent-bright)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Kisal
            </a>
            {' & '}
            <a
              href="https://www.linkedin.com/in/tharusha-nethmina-316b08317"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--color-accent-bright)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Tharusha
            </a>
          </p>
          <p style={{ fontFamily: 'var(--font-data)' }}>Computing Premier League</p>
        </div>
      </div>
    </footer>
  );
}
