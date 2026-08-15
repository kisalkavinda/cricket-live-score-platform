import { Metadata } from 'next';
import Link from 'next/link';
import { tournamentConfig } from '@/config/tournament';
import RegistrationForm from '@/components/registration/RegistrationForm';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: `Team Registration | ${tournamentConfig.name}`,
  description: `Official Team Squad Registration for ${tournamentConfig.name}. Register your squad of 11 playing members and up to 2 registered substitutes.`,
};

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  let tournamentId = 'cpl-2026-tournament';
  let tournamentName = tournamentConfig.name;
  let isClosed = false;

  try {
    const { prisma } = await import('database');
    let activeTournament = await prisma.tournament.findFirst({
      where: {
        status: { in: ['REGISTRATION', 'DRAFT', 'SCHEDULED', 'LIVE'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeTournament) {
      activeTournament = await prisma.tournament.findFirst({
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!activeTournament) {
      activeTournament = await prisma.tournament.create({
        data: {
          name: tournamentConfig.name || 'Computing Premier League 2026',
          season: '2026',
          format: tournamentConfig.format || 'League + Knockout',
          status: 'REGISTRATION',
        },
      });
    }

    if (activeTournament) {
      tournamentId = activeTournament.id;
      const name = activeTournament.name.trim();
      const season = activeTournament.season?.trim();
      tournamentName = season && !name.includes(season) ? `${name} ${season}` : name;
      if (activeTournament.status === 'COMPLETED' || activeTournament.status === 'CANCELLED') {
        isClosed = true;
      }
    }
  } catch {
    // Database fallback
  }

  if (isClosed) {
    return (
      <main style={{ background: 'var(--color-paper-dark)', minHeight: '100vh', color: 'var(--color-paper)' }}>
        <Navbar />
        <div style={{ maxWidth: '640px', margin: '140px auto 60px', padding: '0 20px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '16px' }}>
            Registration Closed
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '24px' }}>
            Registration for this tournament is no longer accepting new submissions.
          </p>
          <Link href="/" className="btn-hallmark-primary">
            Return to Tournament Home
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

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
          padding: '120px 20px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient background glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '700px',
            height: '350px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(192, 39, 45, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          {/* Header Title */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--color-accent-bright)',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Official Tournament Entry Portal
            </span>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 6vw, 4.2rem)',
                fontWeight: 900,
                textTransform: 'uppercase',
                lineHeight: 0.98,
                color: 'var(--color-paper)',
                marginBottom: 'var(--space-md)',
              }}
            >
              Team <span style={{ color: 'var(--color-accent)' }}>Registration</span>
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1.05rem',
                color: 'rgba(255, 255, 255, 0.75)',
                maxWidth: '600px',
                margin: '0 auto',
                lineHeight: 1.55,
              }}
            >
              Register your official university squad for <strong>{tournamentName}</strong>. Please ensure all player credentials and university index numbers are accurate.
            </p>
          </div>

          {/* Registration Rules Notice Box - Highly Visible & Prominent */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(192, 39, 45, 0.08) 100%)',
              border: '1.5px solid rgba(192, 39, 45, 0.45)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 28px',
              marginBottom: 'var(--space-2xl)',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '18px',
                paddingBottom: '14px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--color-accent)',
                  color: 'var(--color-accent-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1rem',
                  flexShrink: 0,
                }}
              >
                ⚖
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-accent-bright)',
                    display: 'block',
                  }}
                >
                  Mandatory Tournament Requirements
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.3rem',
                    fontWeight: 900,
                    color: 'var(--color-paper)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                >
                  Registration Guidelines & Eligibility
                </h3>
              </div>
            </div>

            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <li
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  color: 'rgba(255, 255, 255, 0.95)',
                }}
              >
                <span
                  style={{
                    color: 'var(--color-accent-bright)',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    marginTop: '3px',
                    flexShrink: 0,
                  }}
                >
                  •
                </span>
                <span>
                  <strong style={{ color: 'var(--color-accent-bright)' }}>Squad Structure:</strong> 11 Playing Squad Members + up to 2 Registered Substitutes (Maximum 13 players total).
                </span>
              </li>

              <li
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  color: 'rgba(255, 255, 255, 0.95)',
                }}
              >
                <span
                  style={{
                    color: 'var(--color-accent-bright)',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    marginTop: '3px',
                    flexShrink: 0,
                  }}
                >
                  •
                </span>
                <span>
                  <strong style={{ color: 'var(--color-accent-bright)' }}>Substitute Policy:</strong> Only the registered substitutes listed in this submission are permitted to play if a squad member cannot participate or suffers an injury.
                </span>
              </li>

              <li
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  color: 'rgba(255, 255, 255, 0.95)',
                }}
              >
                <span
                  style={{
                    color: 'var(--color-accent-bright)',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    marginTop: '3px',
                    flexShrink: 0,
                  }}
                >
                  •
                </span>
                <span>
                  <strong style={{ color: 'var(--color-accent-bright)' }}>Absence & Injury Rule:</strong> If an injury occurs and no registered substitutes remain, the team will be forced to play with their remaining players. No external or unregistered replacements are permitted.
                </span>
              </li>

              <li
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  color: 'rgba(255, 255, 255, 0.95)',
                }}
              >
                <span
                  style={{
                    color: 'var(--color-accent-bright)',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    marginTop: '3px',
                    flexShrink: 0,
                  }}
                >
                  •
                </span>
                <span>
                  <strong style={{ color: 'var(--color-accent-bright)' }}>Eligibility:</strong> Only registered university students with valid index numbers are permitted.
                </span>
              </li>

              <li
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  color: 'rgba(255, 255, 255, 0.95)',
                }}
              >
                <span
                  style={{
                    color: 'var(--color-accent-bright)',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    marginTop: '3px',
                    flexShrink: 0,
                  }}
                >
                  •
                </span>
                <span>
                  <strong style={{ color: 'var(--color-accent-bright)' }}>Single Team Rule:</strong> Each student index number can only be registered with one team.
                </span>
              </li>

              <li
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  color: 'rgba(255, 255, 255, 0.95)',
                }}
              >
                <span
                  style={{
                    color: 'var(--color-accent-bright)',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    marginTop: '3px',
                    flexShrink: 0,
                  }}
                >
                  •
                </span>
                <span>
                  <strong style={{ color: 'var(--color-accent-bright)' }}>Captain:</strong> The team leader/captain must be included in the player squad list.
                </span>
              </li>
            </ul>
          </div>

          {/* Form */}
          <RegistrationForm
            tournamentId={tournamentId}
            tournamentName={tournamentName}
          />
        </div>
      </div>

      <Footer />
    </main>
  );
}
