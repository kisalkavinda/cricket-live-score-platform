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
                  href="/"
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
                  href="#details"
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
                  href="#register"
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                  }}
                >
                  Team Registration Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Colophon */}
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
              Direct Contacts
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              <p>Email: <span style={{ fontFamily: 'var(--font-data)' }}>{tournamentConfig.contactEmail}</span></p>
              <p>Phone: <span style={{ fontFamily: 'var(--font-data)' }}>{tournamentConfig.contactPhone}</span></p>
              <p>Event Date: <span style={{ fontFamily: 'var(--font-data)' }}>{tournamentConfig.date || 'TBA'}</span></p>
            </div>
          </div>

          {/* Official Channels */}
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
              Social Media
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <a
                href={tournamentConfig.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-paper)',
                  textDecoration: 'none',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>

              <a
                href={tournamentConfig.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-paper)',
                  textDecoration: 'none',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            </div>
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
          <p style={{ fontFamily: 'var(--font-data)' }}>Cricket Live Score Platform</p>
        </div>
      </div>
    </footer>
  );
}
