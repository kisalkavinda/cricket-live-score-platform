'use client';

import Link from 'next/link';

interface PlayerItem {
  id?: string;
  name: string;
  indexNumber: string;
}

interface RegistrationReceiptData {
  id?: string;
  registrationCode: string;
  teamName: string;
  leaderName: string;
  leaderIndexNumber: string;
  createdAt?: string | Date;
  status?: string;
  tournament?: {
    name?: string;
    season?: string;
  };
  players?: PlayerItem[];
}

interface RegistrationSuccessProps {
  registrationCode: string;
  tournamentName?: string;
  receipt?: RegistrationReceiptData | null;
}

export default function RegistrationSuccess({
  registrationCode,
  tournamentName = 'Computing Premier League 2026',
  receipt,
}: RegistrationSuccessProps) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const players = receipt?.players || [];
  const leaderIndex = receipt?.leaderIndexNumber?.trim().toUpperCase() || '';
  const formattedDate = receipt?.createdAt
    ? new Date(receipt.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleDateString();

  return (
    <div style={{ width: '100%', maxWidth: '780px', margin: '0 auto' }}>
      {/* Print-specific Stylesheet for Official University Tournament Document */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body * {
            visibility: hidden;
          }
          #hallmark-registration-pass, #hallmark-registration-pass * {
            visibility: visible;
          }
          #hallmark-registration-pass {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-black {
            color: #000000 !important;
          }
          .print-muted {
            color: #475569 !important;
          }
          .print-border {
            border-color: #cbd5e1 !important;
          }
          .print-table {
            border: 1.5px solid #000000 !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            border-bottom: 1.5px solid #000000 !important;
          }
          .print-table td {
            border-bottom: 1px solid #cbd5e1 !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Hallmark Ticket / Entry Pass Container */}
      <div
        id="hallmark-registration-pass"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-2xl) var(--space-xl)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
          color: 'var(--color-paper)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* PRINT ONLY: Official University / Tournament Letterhead Header */}
        <div
          className="print-only"
          style={{
            display: 'none',
            borderBottom: '2px solid #000000',
            paddingBottom: '14px',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#000' }}>
                🏏 {tournamentName}
              </div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', color: '#475569' }}>
                Official Squad Registration Credential & Entry Pass
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 900, color: '#000' }}>
                {registrationCode}
              </div>
              <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>
                Issued: {formattedDate}
              </div>
            </div>
          </div>
        </div>

        {/* Subtle Radial Glow (Web Only) */}
        <div
          aria-hidden="true"
          className="no-print"
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(192, 39, 45, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Header Badge */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div
            className="no-print"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(192, 39, 45, 0.15)',
              border: '2px solid var(--color-accent)',
              color: 'var(--color-accent-bright)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              fontWeight: 900,
              marginBottom: 'var(--space-sm)',
              boxShadow: '0 0 20px rgba(192, 39, 45, 0.3)',
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
              color: 'var(--color-accent-bright)',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            Official Entry Receipt
          </span>

          <h1
            className="print-black"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              lineHeight: 1,
              letterSpacing: '0.02em',
              color: 'var(--color-paper)',
              margin: '0 0 8px',
            }}
          >
            {receipt?.teamName || 'Registration Confirmed'}
          </h1>

          <p
            className="print-muted"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0,
            }}
          >
            Official Team Entry Pass for <strong>{tournamentName}</strong>
          </p>
        </div>

        {/* Hallmark Reference Code Ticket Box */}
        <div
          className="print-border"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1.5px dashed var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-xl)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span
            className="print-muted"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Official Reference Number
          </span>

          <div
            className="print-black"
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              fontWeight: 900,
              color: 'var(--color-paper)',
              letterSpacing: '0.08em',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
            }}
          >
            {registrationCode}
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: 'rgba(192, 39, 45, 0.2)',
              border: '1px solid var(--color-accent)',
              color: 'var(--color-paper)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--color-accent-bright)',
              }}
              className="animate-pulse-dot"
            />
            Status: Pending Committee Verification
          </div>
        </div>

        {/* Team Metadata Grid */}
        {receipt && (
          <div
            className="print-border"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-md)',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md) var(--space-lg)',
              marginBottom: 'var(--space-xl)',
            }}
          >
            <div>
              <span
                className="print-muted"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.5)',
                  display: 'block',
                  marginBottom: '2px',
                }}
              >
                Team Name
              </span>
              <strong
                className="print-black"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--color-paper)',
                }}
              >
                {receipt.teamName}
              </strong>
            </div>

            <div>
              <span
                className="print-muted"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.5)',
                  display: 'block',
                  marginBottom: '2px',
                }}
              >
                Team Captain
              </span>
              <strong
                className="print-black"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--color-paper)',
                }}
              >
                {receipt.leaderName}
              </strong>
            </div>

            <div>
              <span
                className="print-muted"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.5)',
                  display: 'block',
                  marginBottom: '2px',
                }}
              >
                Captain Index
              </span>
              <strong
                className="print-black"
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--color-accent-bright)',
                }}
              >
                {receipt.leaderIndexNumber}
              </strong>
            </div>

            <div>
              <span
                className="print-muted"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.5)',
                  display: 'block',
                  marginBottom: '2px',
                }}
              >
                Squad Size
              </span>
              <strong
                className="print-black"
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--color-paper)',
                }}
              >
                {players.length} Players
              </strong>
            </div>
          </div>
        )}

        {/* Complete Registered Team Members Table */}
        {players.length > 0 && (
          <div
            className="print-border"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginBottom: 'var(--space-xl)',
            }}
          >
            <div
              className="print-border"
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                background: 'rgba(0, 0, 0, 0.2)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3
                className="print-black"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  color: 'var(--color-paper)',
                  margin: 0,
                }}
              >
                Official Squad Roster ({players.length})
              </h3>
            </div>

            <div className="table-responsive-container">
              <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left', minWidth: '400px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.15)' }}>
                    <th style={{ padding: '10px 16px', color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'var(--font-data)', fontSize: '0.75rem', width: '50px' }}>#</th>
                    <th style={{ padding: '10px 16px', color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Player Full Name</th>
                    <th style={{ padding: '10px 16px', color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, textAlign: 'right' }}>University Index Number</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, idx) => {
                    const isCaptain = p.indexNumber?.trim().toUpperCase() === leaderIndex;
                    return (
                      <tr
                        key={p.id || idx}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                        }}
                      >
                        <td className="print-black" style={{ padding: '10px 16px', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'var(--font-data)', fontSize: '0.8rem' }}>
                          {idx + 1}
                        </td>
                        <td className="print-black" style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--color-paper)' }}>
                          {p.name} {isCaptain ? <span style={{ color: 'var(--color-accent-bright)', fontSize: '0.75rem', fontWeight: 800, marginLeft: '6px' }}>(Captain)</span> : ''}
                        </td>
                        <td className="print-black" style={{ padding: '10px 16px', fontFamily: 'var(--font-data)', color: isCaptain ? 'var(--color-accent-bright)' : 'rgba(255, 255, 255, 0.8)', fontWeight: isCaptain ? 800 : 500, textAlign: 'right' }}>
                          {p.indexNumber}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Important Next Steps Box */}
        <div
          className="print-border"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md) var(--space-lg)',
            marginBottom: 'var(--space-xl)',
            textAlign: 'left',
          }}
        >
          <span
            className="print-black"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-bright)',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            Important Instructions
          </span>
          <ul
            className="print-muted"
            style={{
              paddingLeft: '18px',
              fontSize: '0.85rem',
              color: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            <li>Save this receipt or click <strong>Print / Save as PDF</strong> for your team records.</li>
            <li>The tournament organizing committee will verify all student university index numbers.</li>
            <li>Your team captain will receive match fixture schedules and pitch allocations via WhatsApp.</li>
          </ul>
        </div>

        {/* PRINT ONLY: Official Verification & Signature Box */}
        <div
          className="print-only"
          style={{
            display: 'none',
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1.5px solid #000000',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', fontSize: '11px', color: '#000' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '35px' }}>Team Captain Acknowledgment:</div>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '4px' }} />
              <div style={{ color: '#475569' }}>Signature & Date</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '35px' }}>Tournament Organizing Committee Seal:</div>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '4px' }} />
              <div style={{ color: '#475569' }}>Authorized Signature & Official Stamp</div>
            </div>
          </div>
        </div>

        {/* Hallmark Action Buttons (Web Only) */}
        <div
          className="no-print"
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
            style={{
              height: '46px',
              padding: '0 24px',
              borderRadius: 'var(--radius-sm)',
              background: '#182030',
              color: '#FFFFFF',
              border: '1.5px solid #334155',
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
              transition: 'all var(--dur-fast) var(--ease-out)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#243048';
              e.currentTarget.style.borderColor = '#64748B';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#182030';
              e.currentTarget.style.borderColor = '#334155';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <span style={{ fontSize: '18px' }}>🖨️</span>
            <span>PRINT / SAVE AS PDF</span>
          </button>

          <Link
            href="/"
            style={{
              height: '46px',
              padding: '0 28px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-accent)',
              color: '#FFFFFF',
              border: '1.5px solid var(--color-accent-bright)',
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              textDecoration: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 16px rgba(192, 39, 45, 0.4)',
              transition: 'all var(--dur-fast) var(--ease-out)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-accent-hover)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-accent)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <span>RETURN TO TOURNAMENT HOME →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
