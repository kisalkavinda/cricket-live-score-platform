'use client';

import { useState } from 'react';
import Link from 'next/link';
import { tournamentConfig } from '@/config/tournament';

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

  const whatsappUrl = tournamentConfig.captainsWhatsappGroupUrl || 'https://chat.whatsapp.com/BbdQ3ZlmjH0G6inbsFXhOb';

  return (
    <div style={{ width: '100%', maxWidth: '860px', margin: '0 auto' }}>
      {/* High-Resolution Executive Print & PDF Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #official-pass-document, #official-pass-document * {
            visibility: visible !important;
          }
          #official-pass-document {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 24px 28px !important;
            border: 2px solid #0F172A !important;
            border-radius: 8px !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          /* Print Typography & Colors */
          .print-black {
            color: #000000 !important;
          }
          .print-dark {
            color: #1E293B !important;
          }
          .print-muted {
            color: #475569 !important;
          }
          .print-crimson {
            color: #C0272D !important;
          }
          .print-box-bg {
            background-color: #F8FAFC !important;
            border: 1px solid #CBD5E1 !important;
          }
          .print-table-th {
            background-color: #F1F5F9 !important;
            color: #0F172A !important;
            border-bottom: 2px solid #94A3B8 !important;
          }
          .print-table-td {
            border-bottom: 1px solid #E2E8F0 !important;
            color: #0F172A !important;
          }
          .print-table-captain-row {
            background-color: #FEF2F2 !important;
          }
          .print-captain-badge {
            background-color: #FEE2E2 !important;
            border: 1px solid #DC2626 !important;
            color: #DC2626 !important;
          }
          .print-index-mono {
            color: #0F172A !important;
            font-weight: 700 !important;
          }
        }
      `}</style>

      {/* Main Hallmark Accreditation Card */}
      <div
        id="official-pass-document"
        style={{
          backgroundColor: '#12141A',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(24px, 5vw, 40px)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(192, 39, 45, 0.2)',
          color: 'var(--color-paper)',
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
            paddingBottom: '14px',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#000000', lineHeight: 1.15 }}>
                🏏 {tournamentName}
              </div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em', color: '#C0272D', marginTop: '3px' }}>
                Official Squad Accreditation & Entry Pass
              </div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                Tournament Grounds: {tournamentConfig.venue || 'Ratmalana CGR Ground'} · Match Date: {tournamentConfig.date || 'September 13, 2026'}
              </div>
            </div>
            <div style={{ textAlign: 'right', border: '1.5px solid #000000', padding: '6px 14px', borderRadius: '4px', backgroundColor: '#F8FAFC' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.08em' }}>
                Registration Reference
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 900, color: '#000000', letterSpacing: '0.05em' }}>
                {registrationCode}
              </div>
              <div style={{ fontSize: '8.5px', color: '#64748B', marginTop: '1px' }}>
                Issued: {formattedDate}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* WEB ONLY: AMBIENT GLOW & HERO SUCCESS BADGE (HALLMARK SPORT STYLE)         */}
        {/* ========================================================================= */}
        <div
          aria-hidden="true"
          className="no-print"
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '360px',
            height: '360px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(192, 39, 45, 0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="no-print" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(192, 39, 45, 0.15)',
              border: '2px solid var(--color-accent)',
              color: 'var(--color-accent-bright)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              boxShadow: '0 0 30px rgba(192, 39, 45, 0.35)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ width: '12px', height: '2px', background: 'var(--color-accent)', display: 'inline-block' }} />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--color-accent-bright)',
              }}
            >
              Squad Submission Verified
            </span>
            <span style={{ width: '12px', height: '2px', background: 'var(--color-accent)', display: 'inline-block' }} />
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              color: 'var(--color-paper)',
              margin: '0 0 6px',
              lineHeight: 1.05,
            }}
          >
            {receipt?.teamName || 'Official Squad Pass'}
          </h1>

          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.92rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
            Accreditation Entry Pass · <strong style={{ color: 'var(--color-paper)' }}>{tournamentName}</strong>
          </p>
        </div>

        {/* ========================================================================= */}
        {/* TICKET PASS HERO CODE BOX (WEB ONLY)                                      */}
        {/* ========================================================================= */}
        <div
          className="no-print"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1.5px dashed rgba(192, 39, 45, 0.6)',
            borderRadius: 'var(--radius-md)',
            padding: '24px 20px',
            marginBottom: 'var(--space-lg)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.4)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Official Reference Code
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
                fontWeight: 900,
                color: 'var(--color-paper)',
                letterSpacing: '0.08em',
                textShadow: '0 2px 14px rgba(192, 39, 45, 0.4)',
              }}
            >
              {registrationCode}
            </span>

            <button
              type="button"
              onClick={handleCopyCode}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: copied ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.2)',
                color: copied ? '#34D399' : 'var(--color-paper)',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all var(--dur-fast)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy Code'}
            </button>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 14px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#FBBF24',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FBBF24' }} />
            <span>Status: Pending Committee Review</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MANDATORY ACTION: CAPTAINS WHATSAPP BRIEFING (WEB ONLY)                   */}
        {/* ========================================================================= */}
        <div
          className="no-print"
          style={{
            background: 'linear-gradient(135deg, rgba(192, 39, 45, 0.12) 0%, rgba(20, 22, 28, 0.95) 100%)',
            border: '1.5px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
            marginBottom: 'var(--space-lg)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(192, 39, 45, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-accent)',
                }}
                className="animate-pulse-dot"
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
                Mandatory Briefing • Team Captains
              </span>
            </div>

            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.35rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.01em',
                color: 'var(--color-paper)',
                margin: '0 0 6px 0',
                lineHeight: 1.15,
              }}
            >
              Join Official Captains WhatsApp Group
            </h3>

            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              All team captains <strong style={{ color: 'var(--color-paper)' }}>must join this official group</strong> for final fixture schedules, pitch allocations, toss timings, and referee briefings.
            </p>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-hallmark-primary"
            style={{
              padding: '0 24px',
              height: '46px',
              fontSize: '0.95rem',
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}
          >
            <span>Join Captains Group</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </a>
        </div>

        {/* ========================================================================= */}
        {/* TEAM PROFILE METADATA GRID                                                */}
        {/* ========================================================================= */}
        {receipt && (
          <div
            className="print-box-bg"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              marginBottom: 'var(--space-lg)',
            }}
          >
            <div>
              <div className="print-muted" style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '0.08em', marginBottom: '3px' }}>
                Team Franchise
              </div>
              <div className="print-black" style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-paper)' }}>
                {receipt.teamName}
              </div>
            </div>

            <div>
              <div className="print-muted" style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '0.08em', marginBottom: '3px' }}>
                Team Captain
              </div>
              <div className="print-dark" style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-paper)' }}>
                {receipt.leaderName}
              </div>
            </div>

            <div>
              <div className="print-muted" style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '0.08em', marginBottom: '3px' }}>
                Captain Index
              </div>
              <div className="print-index-mono" style={{ fontFamily: 'var(--font-data)', fontSize: '1rem', fontWeight: 800, color: '#FBBF24' }}>
                {receipt.leaderIndexNumber}
              </div>
            </div>

            <div>
              <div className="print-muted" style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '0.08em', marginBottom: '3px' }}>
                Squad Roster Size
              </div>
              <div className="print-dark" style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 800, color: 'var(--color-paper)' }}>
                {players.length} Players {players.length > 11 ? `(11 + ${players.length - 11} Subs)` : ''}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* OFFICIAL SQUAD ROSTER TABLE                                               */}
        {/* ========================================================================= */}
        {players.length > 0 && (
          <div
            className="print-box-bg"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginBottom: 'var(--space-lg)',
            }}
          >
            <div
              className="print-table-th"
              style={{
                padding: '12px 18px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div className="print-black" style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-paper)' }}>
                Official Squad Roster ({players.length} Registered Players)
              </div>
              <div className="print-muted" style={{ fontFamily: 'var(--font-data)', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                {formattedDate}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
                <thead>
                  <tr className="print-table-th" style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th className="print-muted" style={{ padding: '8px 16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.72rem', fontWeight: 700, width: '45px' }}>#</th>
                    <th className="print-muted" style={{ padding: '8px 16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Player Name</th>
                    <th className="print-muted" style={{ padding: '8px 16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>University Index</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, idx) => {
                    const isCaptain = p.indexNumber?.trim().toUpperCase() === leaderIndex;
                    return (
                      <tr
                        key={p.id || idx}
                        className={isCaptain ? 'print-table-captain-row print-table-td' : 'print-table-td'}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          backgroundColor: isCaptain ? 'rgba(192, 39, 45, 0.08)' : 'transparent',
                        }}
                      >
                        <td className="print-muted" style={{ padding: '9px 16px', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'var(--font-data)' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="print-dark" style={{ padding: '9px 16px', fontWeight: 700, color: 'var(--color-paper)', fontFamily: 'var(--font-body)' }}>
                          {p.name}
                          {isCaptain && (
                            <span
                              className="print-captain-badge"
                              style={{
                                marginLeft: '8px',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'rgba(192, 39, 45, 0.2)',
                                border: '1px solid var(--color-accent)',
                                color: 'var(--color-accent-bright)',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                              }}
                            >
                              Captain
                            </span>
                          )}
                        </td>
                        <td className="print-index-mono" style={{ padding: '9px 16px', fontFamily: 'var(--font-data)', fontWeight: 700, color: isCaptain ? '#FBBF24' : 'rgba(255, 255, 255, 0.8)', textAlign: 'right' }}>
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
        {/* HALLMARK INSTRUCTIONS & CAPTAIN DIRECTIVES CARD                           */}
        {/* ========================================================================= */}
        <div
          className="print-box-bg"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-md)',
            padding: '22px 24px',
            marginBottom: 'var(--space-xl)',
          }}
        >
          {/* Card Header */}
          <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ width: '10px', height: '2px', background: 'var(--color-accent)', display: 'inline-block' }} />
              <span
                className="print-crimson"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent-bright)',
                }}
              >
                Accreditation Directives
              </span>
            </div>
            <h3
              className="print-black"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                color: 'var(--color-paper)',
                margin: 0,
              }}
            >
              Post-Registration Protocols
            </h3>
          </div>

          {/* 3 Structured Items with SVG Icons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Directive 1 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(192, 39, 45, 0.15)',
                  color: 'var(--color-accent-bright)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className="print-black" style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-paper)', marginBottom: '2px' }}>
                  Digital & Physical Accreditation Pass
                </div>
                <div className="print-muted" style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.45 }}>
                  Save or print this accreditation pass. The team reference code is required for physical team verification and toss registration at the venue dugout.
                </div>
              </div>
            </div>

            {/* Directive 2 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(192, 39, 45, 0.15)',
                  color: 'var(--color-accent-bright)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className="print-black" style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-paper)', marginBottom: '2px' }}>
                  Faculty Registry & Batch Authentication
                </div>
                <div className="print-muted" style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.45 }}>
                  All university student index numbers will undergo verification against official faculty registers. Unregistered or mismatched players are ineligible.
                </div>
              </div>
            </div>

            {/* Directive 3 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(192, 39, 45, 0.15)',
                  color: 'var(--color-accent-bright)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className="print-black" style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-paper)', marginBottom: '2px' }}>
                  Match Day Schedules & Ground Reporting
                </div>
                <div className="print-muted" style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.45 }}>
                  Match fixture timings, pitch allocations, and toss calls are broadcast via the official Captains WhatsApp group. All teams must report to Ratmalana CGR Ground by 08:00 AM.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PRINT ONLY: OFFICIAL SIGNATURE & STAMP ENDORSEMENTS                       */}
        {/* ========================================================================= */}
        <div
          className="print-only"
          style={{
            display: 'none',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1.5px solid #000000',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', fontSize: '10.5px', color: '#000000' }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: '36px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Team Captain Acknowledgment:
              </div>
              <div style={{ borderBottom: '1px solid #000000', marginBottom: '3px' }} />
              <div style={{ color: '#475569', fontSize: '9.5px' }}>
                Captain Signature & Date: ______________________
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: '36px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Organizing Committee Authorization:
              </div>
              <div style={{ borderBottom: '1px solid #000000', marginBottom: '3px' }} />
              <div style={{ color: '#475569', fontSize: '9.5px' }}>
                Official Stamp & Tournament Director Approval
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
              height: '46px',
              padding: '0 24px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--color-paper)',
              border: '1.5px solid rgba(255, 255, 255, 0.25)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all var(--dur-fast)',
            }}
          >
            <span>🖨️</span>
            <span>Print / Save as PDF</span>
          </button>

          <Link
            href="/"
            className="btn-hallmark-primary"
            style={{
              height: '46px',
              padding: '0 28px',
              fontSize: '0.95rem',
            }}
          >
            <span>Return to Tournament Home →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
