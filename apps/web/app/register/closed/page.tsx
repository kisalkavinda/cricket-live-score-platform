import { Metadata } from 'next';
import Link from 'next/link';
import { tournamentConfig } from '@/config/tournament';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: `Registration Closed | ${tournamentConfig.name}`,
  description: `Team registration for this tournament is no longer accepting new submissions.`,
};

export default function RegisterClosedPage() {
  return (
    <main
      style={{
        background: 'var(--color-paper-dark)',
        minHeight: '100vh',
        color: 'var(--color-paper)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Navbar />

      <div
        style={{
          flex: 1,
          padding: '140px 20px 80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1.5px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-2xl) var(--space-xl)',
            textAlign: 'center',
            maxWidth: '600px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(192, 39, 45, 0.15)',
              border: '2px solid var(--color-accent)',
              color: 'var(--color-accent-bright)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              margin: '0 auto var(--space-lg)',
            }}
          >
            🔒
          </div>

          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-bright)',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            Entry Window Concluded
          </span>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 3rem)',
              fontWeight: 900,
              color: 'var(--color-paper)',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            Team Registration Closed
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.75)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-xl)',
            }}
          >
            Registration for <strong>{tournamentConfig.name}</strong> is currently closed. Squad rosters and fixture schedules will be announced soon.
          </p>

          <Link href="/" className="btn-hallmark-primary" style={{ height: '44px', padding: '0 24px' }}>
            Return to Tournament Home →
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
