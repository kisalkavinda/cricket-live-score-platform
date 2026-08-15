'use client';

import { useState } from 'react';
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
  leaderWhatsapp?: string;
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
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(registrationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const players = receipt?.players || [];
  const leaderIndex = receipt?.leaderIndexNumber?.trim().toUpperCase() || '';
  const formattedDate = receipt?.createdAt
    ? new Date(receipt.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });

  return (
    <div style={{ width: '100%', maxWidth: '820px', margin: '0 auto' }}>
      {/* Print-specific Stylesheet for Official A4 Letterhead Document */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          body * {
            visibility: hidden;
          }
          #official-pass-document, #official-pass-document * {
            visibility: visible;
          }
          #official-pass-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
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
        }
      `}</style>

      {/* Main Document Card Container */}
      <div
        id="official-pass-document"
        style={{
          backgroundColor: '#101622',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '36px 32px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(192, 39, 45, 0.15)',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ========================================================================= */}
        {/* PRINT ONLY: OFFICIAL A4 UNIVERSITY LETTERHEAD HEADER                      */}
        {/* ========================================================================= */}
        <div
          className="print-only"
          style={{
            display: 'none',
            borderBottom: '2.5px solid #000000',
            paddingBottom: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#000000', lineHeight: 1.1 }}>
                🏏 {tournamentName}
              </div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em', color: '#475569', marginTop: '4px' }}>
                Official Squad Accreditation & Entry Pass
              </div>
            </div>
            <div style={{ textAlign: 'right', border: '1.5px solid #000', padding: '6px 12px', borderRadius: '4px', backgroundColor: '#F8FAFC' }}>
              <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.06em' }}>
                Registration Code
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 900, color: '#000000', letterSpacing: '0.05em' }}>
                {registrationCode}
              </div>
              <div style={{ fontSize: '9px', color: '#64748B', marginTop: '2px' }}>
                Issued: {formattedDate}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* WEB ONLY: AMBIENT GLOW & HERO SUCCESS BADGE                               */}
        {/* ========================================================================= */}
        <div
          aria-hidden="true"
          className="no-print"
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(192, 39, 45, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="no-print" style={{ textAlign: 'center', marginBottom: '28px' }}>
          {/* Animated Success Seal */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10B981',
              color: '#34D399',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 900,
              marginBottom: '12px',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)',
            }}
          >
            ✓
          </div>

          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#10B981',
              marginBottom: '6px',
            }}
          >
            Registration Successfully Submitted
          </div>

          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
              margin: '0 0 6px',
            }}
          >
            {receipt?.teamName || 'Official Squad Pass'}
          </h1>

          <p style={{ fontSize: '13px', color: '#8B9BB4', margin: 0 }}>
            Official Tournament Entry Pass for <strong>{tournamentName}</strong>
          </p>
        </div>

        {/* ========================================================================= */}
        {/* TICKET PASS HERO CODE BOX                                                 */}
        {/* ========================================================================= */}
        <div
          style={{
            backgroundColor: '#0A0D14',
            border: '1.5px dashed rgba(192, 39, 45, 0.5)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#8B9BB4',
            }}
          >
            Official Reference Code
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '28px',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '0.08em',
                textShadow: '0 2px 12px rgba(192, 39, 45, 0.4)',
              }}
            >
              {registrationCode}
            </span>

            <button
              type="button"
              className="no-print"
              onClick={handleCopyCode}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: copied ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.18)',
                color: copied ? '#34D399' : '#FFFFFF',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy Code'}
            </button>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#FBBF24',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FBBF24' }} />
            <span>Status: Pending Committee Review</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TEAM PROFILE METADATA GRID                                                */}
        {/* ========================================================================= */}
        {receipt && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '14px',
              backgroundColor: '#141A26',
              border: '1px solid #1E2638',
              borderRadius: '10px',
              padding: '16px 20px',
              marginBottom: '24px',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#8B9BB4', letterSpacing: '0.06em', marginBottom: '3px' }}>
                Team Franchise
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                {receipt.teamName}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#8B9BB4', letterSpacing: '0.06em', marginBottom: '3px' }}>
                Team Captain
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                {receipt.leaderName}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#8B9BB4', letterSpacing: '0.06em', marginBottom: '3px' }}>
                Captain Index
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'monospace', color: '#FBBF24' }}>
                {receipt.leaderIndexNumber}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#8B9BB4', letterSpacing: '0.06em', marginBottom: '3px' }}>
                Squad Size
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                {players.length} Players (11 + {Math.max(0, players.length - 11)} Subs)
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* OFFICIAL SQUAD ROSTER TABLE                                               */}
        {/* ========================================================================= */}
        {players.length > 0 && (
          <div
            style={{
              backgroundColor: '#141A26',
              border: '1px solid #1E2638',
              borderRadius: '10px',
              overflow: 'hidden',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                padding: '12px 18px',
                backgroundColor: '#0F141E',
                borderBottom: '1px solid #1E2638',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#FFFFFF' }}>
                Official Squad Roster ({players.length} Players)
              </div>
              <div style={{ fontSize: '11px', color: '#8B9BB4' }}>
                {formattedDate}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#101622', borderBottom: '1px solid #1E2638' }}>
                    <th style={{ padding: '10px 16px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, width: '45px' }}>#</th>
                    <th style={{ padding: '10px 16px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Player Name</th>
                    <th style={{ padding: '10px 16px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>University Index</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, idx) => {
                    const isCaptain = p.indexNumber?.trim().toUpperCase() === leaderIndex;
                    return (
                      <tr
                        key={p.id || idx}
                        style={{
                          borderBottom: '1px solid #161D2B',
                          backgroundColor: isCaptain ? 'rgba(192, 39, 45, 0.05)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '10px 16px', color: '#64748B', fontFamily: 'monospace' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#FFFFFF' }}>
                          {p.name}
                          {isCaptain && (
                            <span
                              style={{
                                marginLeft: '8px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(192, 39, 45, 0.2)',
                                border: '1px solid #C0272D',
                                color: '#F87171',
                                fontSize: '10px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                              }}
                            >
                              Captain
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 700, color: isCaptain ? '#FBBF24' : '#94A3B8', textAlign: 'right' }}>
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

        {/* ========================================================================= */}
        {/* INSTRUCTIONS & NEXT STEPS                                                 */}
        {/* ========================================================================= */}
        <div
          style={{
            backgroundColor: '#0F141E',
            border: '1px solid #1E2638',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '28px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#FBBF24', marginBottom: '8px', letterSpacing: '0.04em' }}>
            📌 Important Captain Guidelines
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#8B9BB4', lineHeight: 1.5 }}>
            <li>Please download or save this receipt as a PDF for team accreditation records.</li>
            <li>The Organizing Committee will verify university student index numbers against official faculty registers.</li>
            <li>The Team Captain will receive match fixtures, pitch assignments, and toss times via WhatsApp.</li>
          </ul>
        </div>

        {/* ========================================================================= */}
        {/* PRINT ONLY: OFFICIAL SIGNATURE & STAMP ENDORSEMENTS                       */}
        {/* ========================================================================= */}
        <div
          className="print-only"
          style={{
            display: 'none',
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '2px solid #000000',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', fontSize: '11px', color: '#000000' }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: '40px', textTransform: 'uppercase' }}>
                Team Captain Acknowledgment:
              </div>
              <div style={{ borderBottom: '1.5px solid #000000', marginBottom: '4px' }} />
              <div style={{ color: '#475569', fontSize: '10px' }}>
                Signature & Date: ______________________
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: '40px', textTransform: 'uppercase' }}>
                Organizing Committee Authorization:
              </div>
              <div style={{ borderBottom: '1.5px solid #000000', marginBottom: '4px' }} />
              <div style={{ color: '#475569', fontSize: '10px' }}>
                Official Seal & Committee Representative Stamp
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* WEB ONLY: ACTION BUTTONS                                                  */}
        {/* ========================================================================= */}
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
              height: '44px',
              padding: '0 24px',
              borderRadius: '8px',
              backgroundColor: '#1E2638',
              color: '#FFFFFF',
              border: '1px solid #2A364E',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🖨️</span>
            <span>Print / Save as PDF</span>
          </button>

          <Link
            href="/"
            style={{
              height: '44px',
              padding: '0 28px',
              borderRadius: '8px',
              backgroundColor: '#C0272D',
              color: '#FFFFFF',
              border: '1px solid #D32F35',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.02em',
              textDecoration: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(192, 39, 45, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Return to Tournament Home →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
