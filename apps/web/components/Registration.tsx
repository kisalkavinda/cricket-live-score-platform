import Link from 'next/link';
import { tournamentConfig } from '../config/tournament';
import { getCachedRegisteredTeamsCount } from '@/lib/public/teams';

export default async function Registration() {
  const registeredTeamsCount = await getCachedRegisteredTeamsCount();

  const regOpen = true;

  const requirements = [
    { id: 'req-1', text: 'Official Team Name' },
    { id: 'req-2', text: "Captain's Contact & WhatsApp Details" },
    { id: 'req-3', text: '11 Playing Members + Up to 2 Substitutes (Max 13)' },
    { id: 'req-4', text: 'Valid University Student Index Numbers' },
  ];

  return (
    <section
      id="register"
      style={{
        padding: 'var(--space-3xl) 0',
        background: 'var(--color-paper-dark)',
        color: 'var(--color-paper)',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-label="Team Registration"
    >
      {/* Background Accent Tint */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(192, 39, 45, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 var(--space-md)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Editorial Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto var(--space-2xl)' }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-bright)',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            Official Entry Portal
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.8rem, 6vw, 4.5rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              lineHeight: 0.95,
              color: 'var(--color-paper)',
              marginBottom: 'var(--space-md)',
              overflowWrap: 'anywhere',
            }}
          >
            Register Your <span style={{ color: 'var(--color-accent)' }}>Squad</span>
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.7)',
              lineHeight: 1.6,
            }}
          >
            Ensure your team meets all tournament eligibility requirements prior to submitting your official squad roster.
          </p>
        </div>

        {/* Tournament Ticket / Entry Pass Layout (No re-drawn browser chrome - Gate 47) */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Registration Status Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
              paddingBottom: 'var(--space-md)',
              marginBottom: 'var(--space-xl)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent-bright)',
                }}
              >
                Official Entry Pass
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--color-paper)',
                }}
              >
                Squad Roster Application
              </h3>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: regOpen ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.1)',
                color: 'var(--color-paper)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
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
              {regOpen ? 'Registration Active' : 'Portal Closed'}
            </div>
          </div>

          {/* Checklist Requirements Grid */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-subtle)',
                display: 'block',
                marginBottom: 'var(--space-md)',
              }}
            >
              Submission Checklist
            </span>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--space-md)',
              }}
            >
              {requirements.map((req) => (
                <div
                  key={req.id}
                  id={req.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: 'var(--space-md)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--color-accent-soft)',
                      color: 'var(--color-accent-bright)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.85)',
                    }}
                  >
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Deadline & CTA Section Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
              padding: 'var(--space-md) var(--space-lg)',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--color-ink-subtle)',
                }}
              >
                Registration Deadline
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--color-paper)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {tournamentConfig.registrationDeadline || 'TBA'}
              </p>
            </div>

            <Link
              href="/register"
              className="btn-hallmark-primary"
              id="reg-cta-button"
              style={{ height: '44px', padding: '0 20px', maxWidth: '100%' }}
            >
              Complete Registration Form
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
