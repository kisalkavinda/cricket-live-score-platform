import Link from 'next/link';
import { tournamentConfig } from '../config/tournament';
import LottieAnimation from './LottieAnimation';

export default function Hero() {
  const regOpen = true;

  return (
    <section
      id="overview"
      className="hero-section"
      style={{
        position: 'relative',
        minHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'var(--color-paper-dark)',
        color: 'var(--color-paper)',
        overflow: 'hidden',
      }}
      aria-label="CPL Tournament Hero"
    >
      {/* Editorial Background Geometry (Subtle Accent Bloom - Gate 29) */}
      <div
        aria-hidden="true"
        className="hero-bg-blob-top"
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(192, 39, 45, 0.16) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        className="hero-bg-blob-bottom"
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '-5%',
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
        {/* ========================================================================= */}
        {/* DESKTOP HERO VIEW (hidden on mobile via hidden md:block)                  */}
        {/* ========================================================================= */}
        <div className="hero-desktop-content" style={{ maxWidth: '820px' }}>
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
            className="hero-stat-grid"
            style={{
              display: 'grid',
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
          <div className="hero-cta-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center' }}>
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

        {/* ========================================================================= */}
        {/* MOBILE HERO VIEW (HALLMARK SPORT RED & WHITE ARCHETYPE - md:hidden)       */}
        {/* ========================================================================= */}
        <div className="hero-mobile-content">
          {/* Section 1: Header Block with Kicker & Title */}
          <div>
            {/* Status Kicker */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    background: 'var(--color-accent)',
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-accent-bright)',
                  }}
                >
                  Official Championship
                </span>
              </div>

              <span
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--color-ink-subtle)',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                SEASON 2026
              </span>
            </div>

            {/* Main Display Headline */}
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(3.1rem, 13.5vw, 4.4rem)',
                fontWeight: 900,
                textTransform: 'uppercase',
                lineHeight: 0.9,
                letterSpacing: '-0.02em',
                color: 'var(--color-paper)',
                marginBottom: '10px',
                overflowWrap: 'anywhere',
              }}
            >
              COMPUTING <br />
              <span style={{ color: 'var(--color-accent)' }}>PREMIER</span> LEAGUE
            </h1>

            {/* Lede Copy with Red Bar */}
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.92rem',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: 1.5,
                borderLeft: '3px solid var(--color-accent)',
                paddingLeft: '12px',
                margin: 0,
              }}
            >
              {tournamentConfig.tagline}
            </p>
          </div>

          {/* Section 2: Animated Cricket Match Center Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(192, 39, 45, 0.16) 0%, rgba(255, 255, 255, 0.03) 100%)',
              border: '1px solid rgba(192, 39, 45, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent-bright)' }} className="animate-pulse-dot" />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-accent-bright)', letterSpacing: '0.1em' }}>
                  Tournament Hub
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-paper)', lineHeight: 1.15 }}>
                Ball-by-Ball Live Scoring
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '2px' }}>
                Real-time match scores & stage brackets
              </div>
            </div>

            <div
              style={{
                width: '68px',
                height: '68px',
                flexShrink: 0,
                position: 'relative',
                filter: 'drop-shadow(0 4px 12px rgba(192, 39, 45, 0.4))',
              }}
            >
              <LottieAnimation
                src="/animations/bat-ball.lottie"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>

          {/* Section 3: Full Rich Championship Tournament Pass */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
            }}
          >
            {/* Top Pass Strip: Date & Reporting Time */}
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(192, 39, 45, 0.2)',
                    border: '1px solid rgba(192, 39, 45, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-bright)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', letterSpacing: '0.08em' }}>
                    Match Date
                  </div>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.98rem', fontWeight: 800, color: 'var(--color-paper)' }}>
                    {tournamentConfig.date || 'TBA'}
                  </div>
                </div>
              </div>

              {tournamentConfig.time && (
                <div
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'var(--color-accent-bright)',
                    background: 'rgba(192, 39, 45, 0.18)',
                    border: '1px solid rgba(192, 39, 45, 0.4)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    flexShrink: 0,
                  }}
                >
                  Starts {tournamentConfig.time}
                </div>
              )}
            </div>

            {/* Middle Pass Strip: Stadium Venue */}
            <div
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(192, 39, 45, 0.2)',
                    border: '1px solid rgba(192, 39, 45, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-bright)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', letterSpacing: '0.08em' }}>
                    Stadium Venue
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Ratmalana CGR Ground
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-subtle)' }}>
                    Ratmalana United S.C Ground
                  </div>
                </div>
              </div>

              {tournamentConfig.venueMapUrl && (
                <a
                  href={tournamentConfig.venueMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--color-accent-bright)',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                    padding: '4px 8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  Map ↗
                </a>
              )}
            </div>

            {/* Bottom Pass Strip: 3-Column Tournament Specifications */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                background: 'rgba(0, 0, 0, 0.25)',
              }}
            >
              <div style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', letterSpacing: '0.06em' }}>
                  Format
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-paper)', marginTop: '2px' }}>
                  League + KO
                </div>
              </div>

              <div style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', letterSpacing: '0.06em' }}>
                  Squad Size
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-paper)', marginTop: '2px' }}>
                  11 + 2 Subs
                </div>
              </div>

              <div style={{ padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-subtle)', letterSpacing: '0.06em' }}>
                  Registration
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-accent-bright)', marginTop: '2px' }}>
                  Open Now
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {regOpen ? (
              <Link
                href="/register"
                className="btn-hallmark-primary"
                style={{
                  width: '100%',
                  height: '48px',
                  fontSize: '0.98rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  boxShadow: '0 8px 24px rgba(192, 39, 45, 0.45)',
                }}
              >
                <span>Register Team Squad</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <button
                disabled
                className="btn-hallmark-primary"
                style={{
                  width: '100%',
                  height: '48px',
                  fontSize: '0.88rem',
                }}
              >
                Registration Opening Soon
              </button>
            )}

            <a
              href="#details"
              className="btn-hallmark-outline-dark"
              style={{
                width: '100%',
                height: '42px',
                fontSize: '0.86rem',
              }}
            >
              <span>View Tournament Guidelines</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
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

      {/* Marquee Ticker Bar (Bottom Anchored - Zero Emojis) */}
      <div
        aria-hidden="true"
        className="hero-marquee-bar"
        style={{
          width: '100%',
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
          className="hero-marquee-label"
          style={{
            flexShrink: 0,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.25)',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} className="animate-pulse-dot" />
          <span className="hero-marquee-label-text">OFFICIAL ANNOUNCEMENT</span>
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="animate-marquee">
            {[
              `${tournamentConfig.name} — ${tournamentConfig.tagline}`,
              `Match Date: ${tournamentConfig.date || 'TBA'}${tournamentConfig.time ? ` at ${tournamentConfig.time}` : ''}`,
              `Ground: ${tournamentConfig.venue || 'TBA'}`,
              `Format: ${tournamentConfig.format}`,
              `Official Registration Open — Lock In Your Squad Today`,
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
