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

  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto' }}>
      {/* Print-specific style sheet for high quality PDF / Print export */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #official-registration-slip, #official-registration-slip * {
            visibility: visible;
          }
          #official-registration-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 24px !important;
            border: 2px solid #000000 !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-black-text {
            color: #000000 !important;
          }
          .print-border {
            border-color: #cccccc !important;
          }
          .print-bg {
            background-color: #f8fafc !important;
          }
        }
      `}</style>

      <div
        id="official-registration-slip"
        style={{
          background: 'rgba(17, 22, 34, 0.95)',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '36px 32px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          textAlign: 'center',
        }}
      >
        {/* Success Icon */}
        <div
          className="no-print"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            border: '2px solid #22c55e',
            color: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 800,
            margin: '0 auto 16px',
            boxShadow: '0 0 24px rgba(34, 197, 94, 0.2)',
          }}
        >
          ✓
        </div>

        <span
          style={{
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#22c55e',
            display: 'block',
            marginBottom: '6px',
            fontFamily: 'monospace',
          }}
        >
          Official Team Registration Confirmation
        </span>

        <h1
          className="print-black-text"
          style={{
            fontSize: '28px',
            fontWeight: 900,
            color: '#FFFFFF',
            margin: '0 0 8px',
            letterSpacing: '-0.01em',
          }}
        >
          {receipt?.teamName ? receipt.teamName : 'Team Registration Submitted'}
        </h1>

        <p
          className="print-black-text"
          style={{
            fontSize: '14px',
            color: '#94A3B8',
            lineHeight: 1.5,
            margin: '0 0 24px',
          }}
        >
          Participating in <strong>{tournamentName}</strong>
        </p>

        {/* Official Reference Box */}
        <div
          className="print-bg print-border"
          style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: '#0D111A',
            border: '1.5px dashed rgba(245, 158, 11, 0.4)',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#94A3B8',
              fontFamily: 'monospace',
            }}
          >
            Official Reference Number
          </span>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#FBBF24',
              fontFamily: 'monospace',
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
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#FCD34D',
              fontWeight: 700,
              fontFamily: 'monospace',
            }}
          >
            ● Status: Pending Verification
          </span>
        </div>

        {/* Team & Captain Summary */}
        {receipt && (
          <div
            className="print-bg print-border"
            style={{
              textAlign: 'left',
              backgroundColor: '#141A26',
              border: '1px solid #1E2638',
              borderRadius: '10px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              fontSize: '13px',
            }}
          >
            <div>
              <span style={{ color: '#8B9BB4', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'monospace' }}>
                Team Name
              </span>
              <strong className="print-black-text" style={{ color: '#FFFFFF', fontSize: '14px' }}>
                {receipt.teamName}
              </strong>
            </div>

            <div>
              <span style={{ color: '#8B9BB4', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'monospace' }}>
                Captain / Leader
              </span>
              <strong className="print-black-text" style={{ color: '#FFFFFF', fontSize: '14px' }}>
                {receipt.leaderName}
              </strong>
            </div>

            <div>
              <span style={{ color: '#8B9BB4', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'monospace' }}>
                Captain Index
              </span>
              <strong style={{ color: '#C0272D', fontFamily: 'monospace', fontSize: '13px' }}>
                {receipt.leaderIndexNumber}
              </strong>
            </div>

            <div>
              <span style={{ color: '#8B9BB4', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'monospace' }}>
                Registered Squad
              </span>
              <strong className="print-black-text" style={{ color: '#FFFFFF', fontFamily: 'monospace', fontSize: '13px' }}>
                {players.length} Members
              </strong>
            </div>
          </div>
        )}

        {/* Complete Registered Team Members Table */}
        {players.length > 0 && (
          <div
            style={{
              textAlign: 'left',
              backgroundColor: '#141A26',
              border: '1px solid #1E2638',
              borderRadius: '10px',
              overflow: 'hidden',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid #1E2638',
                backgroundColor: '#10141E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 className="print-black-text" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Official Registered Team Members ({players.length})
              </h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#10141E', borderBottom: '1px solid #1E2638' }}>
                    <th style={{ padding: '10px 16px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, width: '45px' }}>#</th>
                    <th style={{ padding: '10px 16px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700 }}>Player Full Name</th>
                    <th style={{ padding: '10px 16px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700 }}>University Index Number</th>
                    <th style={{ padding: '10px 16px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textAlign: 'right' }}>Squad Role</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, idx) => {
                    const isCaptain = p.indexNumber?.trim().toUpperCase() === leaderIndex;
                    return (
                      <tr key={p.id || idx} style={{ borderBottom: '1px solid #1A2130' }}>
                        <td style={{ padding: '10px 16px', color: '#64748B', fontFamily: 'monospace' }}>
                          {idx + 1}
                        </td>
                        <td className="print-black-text" style={{ padding: '10px 16px', fontWeight: 700, color: '#FFFFFF' }}>
                          {p.name}
                        </td>
                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: isCaptain ? 800 : 500, color: isCaptain ? '#C0272D' : '#CBD5E1' }}>
                          {p.indexNumber}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          {isCaptain ? (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                backgroundColor: 'rgba(192, 39, 45, 0.2)',
                                color: '#F87171',
                                border: '1px solid rgba(192, 39, 45, 0.4)',
                              }}
                            >
                              👑 CAPTAIN
                            </span>
                          ) : idx < 11 ? (
                            <span style={{ fontSize: '11px', color: '#8B9BB4' }}>Playing 11</span>
                          ) : (
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                backgroundColor: '#1E2638',
                                color: '#94A3B8',
                                fontFamily: 'monospace',
                              }}
                            >
                              SUB #{idx - 10}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Important Next Steps */}
        <div
          className="print-bg print-border"
          style={{
            textAlign: 'left',
            backgroundColor: '#141A26',
            border: '1px solid #1E2638',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '28px',
          }}
        >
          <h4
            className="print-black-text"
            style={{
              fontSize: '13px',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '0 0 8px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Important Instructions
          </h4>
          <ul
            className="print-black-text"
            style={{
              paddingLeft: '18px',
              fontSize: '13px',
              color: '#8B9BB4',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            <li>Save this document or take a screenshot of your registration reference code.</li>
            <li>The tournament organizing committee will verify all student university index numbers.</li>
            <li>Once verified and approved, your team captain will be contacted via WhatsApp.</li>
          </ul>
        </div>

        {/* Action Buttons (High Contrast & Visible) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <button
            type="button"
            onClick={handlePrint}
            style={{
              height: '46px',
              padding: '0 24px',
              borderRadius: '8px',
              backgroundColor: '#1E2638',
              border: '1.5px solid #3B4B68',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '16px' }}>🖨️</span>
            <span>PRINT / SAVE AS PDF</span>
          </button>

          <Link
            href="/"
            style={{
              height: '46px',
              padding: '0 26px',
              borderRadius: '8px',
              backgroundColor: '#C0272D',
              border: '1.5px solid #D32F35',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 12px rgba(192, 39, 45, 0.4)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>RETURN TO TOURNAMENT HOME →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
