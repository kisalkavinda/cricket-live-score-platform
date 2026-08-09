import Link from 'next/link';
import { tournamentConfig } from '../config/tournament';

export default function Hero() {
  const regOpen = !!tournamentConfig.registrationFormUrl;

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
              fontSize: 'clamp(4.5rem, 12vw, 9.5rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
              color: 'var(--color-paper)',
              marginBottom: 'var(--space-md)',
              overflowWrap: 'anywhere', // Gate 51
            }}
          >
            CRICKET <span style={{ color: 'var(--color-accent)' }}>PREMIER</span> LEAGUE
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 'var(--space-xs)',
              marginBottom: 'var(--space-xl)',
              maxWidth: '680px',
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
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
                Match Date
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--color-paper)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {tournamentConfig.date || 'TBA'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
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
                  fontFamily: 'var(--font-data)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--color-paper)',
                }}
              >
                League + Knockout
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
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
                Entry Fee
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--color-accent-bright)',
                }}
              >
                {tournamentConfig.entryFee}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center' }}>
            {regOpen ? (
              <Link
                href={tournamentConfig.registrationFormUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hallmark-primary"
                style={{ padding: '0 32px', height: '48px' }}
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
                style={{ height: '48px', padding: '0 32px' }}
              >
                Registration Opening Soon
              </button>
            )}

            <a
              href="#details"
              className="btn-hallmark-outline"
              style={{
                height: '48px',
                color: 'var(--color-paper)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
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

      {/* Floating Cricket Ball Illustration (Right Anchored) */}
      <div
        aria-hidden="true"
        className="hidden lg:block animate-float-ball"
        style={{
          position: 'absolute',
          top: '38%',
          right: '8%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #E8192C 0%, #9B0000 60%, #4A0000 100%)',
            boxShadow: '0 30px 90px rgba(192, 39, 45, 0.5), inset -8px -8px 24px rgba(0, 0, 0, 0.6)',
            position: 'relative',
          }}
        >
          {/* Authentic Seam Lines */}
          <svg viewBox="0 0 220 220" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d="M55 110 C65 70, 95 45, 110 45 C125 45, 155 70, 165 110" stroke="rgba(255,255,255,0.7)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M55 110 C65 150, 95 175, 110 175 C125 175, 155 150, 165 110" stroke="rgba(255,255,255,0.7)" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="110" y1="20" x2="110" y2="200" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
          {/* Specular Light Highlight */}
          <div
            style={{
              position: 'absolute',
              top: '15%',
              left: '20%',
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.25)',
              filter: 'blur(10px)',
            }}
          />
        </div>
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
              `📅 Date: ${tournamentConfig.date || 'TBA'}`,
              `📍 Venue: ${tournamentConfig.venue || 'TBA'}`,
              `🏆 Format: ${tournamentConfig.format}`,
              `🏏 Registrations Closing Soon`,
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
