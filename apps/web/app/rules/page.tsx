import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { tournamentConfig } from '@/config/tournament';

export const metadata = {
  title: 'Match Rules & Tournament Information | CPL 2026',
  description: 'Official Computing Premier League (CPL 2026) match rules, bowling limits, extras, fielding restrictions, points system, awards, and committee provisions.',
};

export default function RulesPage() {
  const rules = tournamentConfig.rules || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper-alt)' }}>
      <Navbar />

      <main style={{ paddingTop: '100px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
          
          {/* Header Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(26, 20, 18, 0.95), rgba(15, 12, 12, 0.98))',
              border: '1px solid rgba(255, 184, 0, 0.25)',
              borderRadius: '20px',
              padding: 'clamp(24px, 5vw, 44px)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
              marginBottom: '36px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 184, 0, 0.15), transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 184, 0, 0.12)', border: '1px solid rgba(255, 184, 0, 0.3)', borderRadius: '9999px', padding: '6px 14px', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.85rem' }}>📜</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#FFB800' }}>
                Official Tournament Guidelines
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)',
                fontWeight: 900,
                color: '#FFFFFF',
                textTransform: 'uppercase',
                lineHeight: 1.05,
                margin: '0 0 12px',
                letterSpacing: '-0.02em',
              }}
            >
              CPL 2026 <span style={{ color: '#FFB800' }}>Match Rules</span> & Info
            </h1>

            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
                color: 'rgba(255, 255, 255, 0.75)',
                maxWidth: '680px',
                lineHeight: 1.55,
                margin: '0 0 24px',
              }}
            >
              Computing Premier League official rules governing bowling allocations, fielding positions, extras, points structure, awards, and committee hospitality.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <Link
                href="/tournament"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#FFB800',
                  color: '#0D0A0A',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  padding: '12px 22px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(255, 184, 0, 0.3)',
                }}
              >
                🏆 Visit Tournament Hub →
              </Link>
            </div>
          </div>

          {/* Rules Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {rules.map((rule, idx) => (
              <div
                key={rule.id || idx}
                id={rule.id}
                style={{
                  background: 'var(--color-paper-card)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.2s ease, transform 0.2s ease',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.4rem' }}>{rule.icon}</span>
                      <h2
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: 'var(--color-ink)',
                          margin: 0,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {rule.title}
                      </h2>
                    </div>
                    {rule.badge && (
                      <span
                        style={{
                          fontFamily: 'var(--font-data)',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: 'var(--color-accent-soft)',
                          color: 'var(--color-accent)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                          border: '1px solid rgba(255, 184, 0, 0.2)',
                        }}
                      >
                        {rule.badge}
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.92rem',
                      lineHeight: 1.6,
                      color: 'var(--color-ink-muted)',
                      margin: 0,
                    }}
                  >
                    {rule.description}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px dashed var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-ink-subtle)' }}>
                    CPL 2026 Rule #{idx + 1}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-accent)', fontWeight: 700 }}>
                    Official
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Notice Card */}
          <div
            style={{
              marginTop: '32px',
              padding: '20px 24px',
              background: 'rgba(255, 184, 0, 0.06)',
              border: '1px solid rgba(255, 184, 0, 0.25)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <strong style={{ color: 'var(--color-ink)', display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>
                Important Reminder for All Captains & Players
              </strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ink-muted)', lineHeight: 1.45 }}>
                Play hard • Play fair • Enjoy the CPL! Please ensure all team members are briefed on these tournament regulations prior to toss.
              </p>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
