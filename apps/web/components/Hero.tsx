import Link from 'next/link';
import { tournamentConfig } from '../config/tournament';
import LottieAnimation from './LottieAnimation';

export default function Hero() {
  const regOpen = true;

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'var(--color-paper-dark)',
        color: 'var(--color-paper)',
        paddingTop: '110px',
        overflow: 'hidden',
      }}
      aria-label="CPL Tournament Hero"
    >
      {/* Editorial Background Geometry (Subtle Accent Bloom - Gate 29) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(192, 39, 45, 0.16) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(192, 39, 45, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Grid Pattern Overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      {/* Main Content Area */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          padding: '0 var(--space-md)',
          position: 'relative',
          zIndex: 10,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* Editorial Header Block */}
        <div style={{ maxWidth: '820px' }}>
          {/* Status Kicker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-sm)' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 14px',
                borderRadius: '9999px',
                background: regOpen ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.08)',
                color: 'var(--color-accent-ink)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                border: regOpen ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'currentColor',
                }}
                className={regOpen ? 'animate-pulse-dot' : ''}
              />
              {regOpen ? 'Registrations Open' : 'Registrations Opening Soon'}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '0.75rem',
                color: 'var(--color-ink-subtle)',
              }}
            >
              SEASON 2026
            </span>
          </div>

          {/* Main Display Headline (Solid Ink High Contrast - Gate 2) */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.75rem, 10vw, 9.5rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
              color: 'var(--color-paper)',
              marginBottom: 'var(--space-md)',
              overflowWrap: 'anywhere', // Gate 51
            }}
          >
            COMPUTING <span style={{ color: 'var(--color-accent)' }}>PREMIER</span> LEAGUE
          </h1>

          {/* Lede Copy with Red Bar Anchor */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: 1.55,
              maxWidth: '620px',
              borderLeft: '3px solid var(--color-accent)',
              paddingLeft: 'var(--space-md)',
              marginBottom: 'var(--space-xl)',
            }}
          >
            {tournamentConfig.tagline}
          </p>

          {/* Asymmetric Stat Chips Bar (Stat-Led Macrostructure) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 'var(--space-xs)',
              marginBottom: 'var(--space-xl)',
              maxWidth: '740px',
            }}
          >
            {/* Stat Chip 1: Match Day */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--color-ink-subtle)',
                  marginBottom: '4px',
                }}
              >
                Match Day
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: 'var(--color-paper)',
                  lineHeight: 1.25,
                }}
              >
                {tournamentConfig.date || 'TBA'}
              </div>
              {tournamentConfig.time && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-accent-bright)',
                    fontWeight: 700,
                    marginTop: '3px',
                    fontFamily: 'var(--font-data)',
                  }}
                >
                  Starts {tournamentConfig.time}
                </div>
              )}
            </div>

            {/* Stat Chip 2: Venue */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--color-ink-subtle)',
                  marginBottom: '4px',
                }}
              >
                Venue
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: 'var(--color-paper)',
                  lineHeight: 1.25,
                }}
              >
                Ratmalana CGR Ground
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-accent-bright)',
                  fontWeight: 700,
                  marginTop: '3px',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Ratmalana United S.C
              </div>
            </div>

            {/* Stat Chip 3: Format */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--color-ink-subtle)',
                  marginBottom: '4px',
                }}
              >
                Format
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: 'var(--color-paper)',
                  lineHeight: 1.25,
                }}
              >
                League + Knockout
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-accent-bright)',
                  fontWeight: 700,
                  marginTop: '3px',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Tournament Elimination
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center' }}>
            {regOpen ? (
              <Link
                href="/register"
                className="btn-hallmark-primary"
                style={{ padding: '0 24px', height: '48px', maxWidth: '100%' }}
              >
                Register Your Team
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ) : (
              <button
                disabled
                className="btn-hallmark-primary"
                style={{
                  height: 'auto',
                  minHeight: '48px',
                  padding: '8px 20px',
                  maxWidth: '100%',
                  whiteSpace: 'normal',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                }}
              >
                Registration Opening Soon
              </button>
            )}

            <a
              href="#details"
              className="btn-hallmark-outline-dark"
              style={{
                height: '48px',
                padding: '0 24px',
              }}
            >
              View Tournament Info
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Floating Bat & Ball DotLottie Animation (Right Anchored - Hero Scale) */}
      <div
        aria-hidden="true"
        className="hidden lg:block animate-float-ball"
        style={{
          position: 'absolute',
          top: '18%',
          right: '2%',
          transform: 'translateY(-50%)',
          width: '580px',
          height: '580px',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 25px 50px rgba(192, 39, 45, 0.4))',
        }}
      >
        <LottieAnimation
          src="/animations/bat-ball.lottie"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Marquee Ticker Bar (Bottom Anchored) */}
      <div
        aria-hidden="true"
        style={{
          width: '100%',
          height: '44px',
          background: 'var(--color-accent)',
          color: 'var(--color-accent-ink)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          marginTop: 'var(--space-xl)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            padding: '0 20px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.25)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.85rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} className="animate-pulse-dot" />
          OFFICIAL ANNOUNCEMENT
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="animate-marquee">
            {[
              `🏏 ${tournamentConfig.name} — ${tournamentConfig.tagline}`,
              `📅 Match Date: ${tournamentConfig.date || 'TBA'}${tournamentConfig.time ? ` at ${tournamentConfig.time}` : ''}`,
              `📍 Ground: ${tournamentConfig.venue || 'TBA'}`,
              `🏆 Format: ${tournamentConfig.format}`,
              `⚡ Registration Open — Lock In Your Squad Today`,
            ].map((text, idx) => (
              <span
                key={idx}
                style={{
                  padding: '0 32px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {text} <span style={{ opacity: 0.5, margin: '0 12px' }}>•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
