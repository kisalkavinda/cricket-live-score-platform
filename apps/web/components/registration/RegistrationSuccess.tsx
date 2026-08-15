'use client';

import Link from 'next/link';

interface RegistrationSuccessProps {
  registrationCode: string;
  tournamentName?: string;
}

export default function RegistrationSuccess({
  registrationCode,
  tournamentName = 'University Cricket Tournament',
}: RegistrationSuccessProps) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1.5px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-2xl) var(--space-xl)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        maxWidth: '680px',
        margin: '0 auto',
      }}
    >
      {/* Success Animated Badge */}
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '2px solid #22c55e',
          color: '#22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          margin: '0 auto var(--space-lg)',
          boxShadow: '0 0 30px rgba(34, 197, 94, 0.25)',
        }}
      >
        ✓
      </div>

      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#22c55e',
          display: 'block',
          marginBottom: '6px',
        }}
      >
        Registration Submitted Successfully
      </span>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
          fontWeight: 900,
          color: 'var(--color-paper)',
          textTransform: 'uppercase',
          marginBottom: 'var(--space-md)',
        }}
      >
        Team Registered
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
        Your team registration for <strong>{tournamentName}</strong> has been received and is currently awaiting organizer verification and approval.
      </p>

      {/* Official Reference Box */}
      <div
        style={{
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1.5px dashed rgba(255, 255, 255, 0.2)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-subtle)',
            display: 'block',
            marginBottom: '6px',
          }}
        >
          Official Registration Reference Number
        </span>
        <div
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
            fontWeight: 800,
            color: 'var(--color-accent-bright)',
            letterSpacing: '0.08em',
          }}
        >
          {registrationCode}
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '8px',
            fontSize: '0.78rem',
            padding: '3px 10px',
            borderRadius: '9999px',
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            color: '#facc15',
            fontWeight: 600,
          }}
        >
          ● Status: Pending Review
        </span>
      </div>

      {/* Instructions list */}
      <div
        style={{
          textAlign: 'left',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-lg)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <h4
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.05rem',
            fontWeight: 800,
            color: 'var(--color-paper)',
            marginBottom: '10px',
            textTransform: 'uppercase',
          }}
        >
          Important Next Steps
        </h4>
        <ul
          style={{
            paddingLeft: '20px',
            fontSize: '0.88rem',
            color: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            lineHeight: 1.4,
          }}
        >
          <li>Save or take a screenshot of your registration reference number.</li>
          <li>The tournament committee will verify all student university index numbers.</li>
          <li>Once approved, your captain will be contacted via WhatsApp with match schedule details.</li>
        </ul>
      </div>

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
        }}
      >
        <button
          type="button"
          onClick={handlePrint}
          className="btn-hallmark-outline"
          style={{ height: '44px', padding: '0 20px' }}
        >
          🖨️ Print / Save Reference
        </button>

        <Link
          href="/"
          className="btn-hallmark-primary"
          style={{ height: '44px', padding: '0 24px' }}
        >
          Return to Tournament Home →
        </Link>
      </div>
    </div>
  );
}
