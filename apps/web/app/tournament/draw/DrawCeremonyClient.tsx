'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchDrawStateAction,
  captainSelectChitAction,
} from '@/lib/tournament/draw-actions';

interface Props {
  tournamentId: string;
  tournamentName: string;
  tournamentSeason: string;
  initialDraw: any;
}

export default function DrawCeremonyClient({
  tournamentId,
  tournamentName,
  tournamentSeason,
  initialDraw,
}: Props) {
  const [draw, setDraw] = useState<any>(initialDraw);
  const [loading, setLoading] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [captainPassActive, setCaptainPassActive] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Animation states
  const [revealingPos, setRevealingPos] = useState<number | null>(null);
  const [revealedResult, setRevealedResult] = useState<{
    pos: number;
    group: string;
    teamName: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Real-time polling synchronization
  useEffect(() => {
    if (!draw || (draw.status !== 'IN_PROGRESS' && draw.status !== 'PAUSED')) return;
    const interval = setInterval(async () => {
      const res = await fetchDrawStateAction(tournamentId);
      if (res.success && res.draw) {
        setDraw(res.draw);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [draw?.status, tournamentId]);

  // Handle Captain Chit Selection
  const handleSelectChit = async (pos: number) => {
    if (!draw || draw.status !== 'IN_PROGRESS' || loading || revealingPos !== null) return;

    if (!passcode || !passcode.trim()) {
      showToast('error', 'Please enter your Captain Pass code first to unlock your pick.');
      setCaptainPassActive(true);
      return;
    }

    setLoading(true);
    setRevealingPos(pos);

    try {
      const res = await captainSelectChitAction(draw.id, pos, passcode.trim());
      if (!res.success) {
        showToast('error', res.error || 'Chit selection rejected.');
        setRevealingPos(null);
        return;
      }

      // Show reveal animation
      const currentCap = draw.currentCaptain;
      setRevealedResult({
        pos,
        group: res.groupLabel,
        teamName: currentCap?.team?.name || 'Your Team',
      });

      // Clear passcode after successful turn
      setPasscode('');

      // Keep animation on screen for 1.8s
      setTimeout(async () => {
        setRevealingPos(null);
        setRevealedResult(null);
        const stateRes = await fetchDrawStateAction(tournamentId);
        if (stateRes.success && stateRes.draw) setDraw(stateRes.draw);
      }, 1800);
    } catch (err: any) {
      showToast('error', err.message);
      setRevealingPos(null);
    } finally {
      setLoading(false);
    }
  };

  const isLive = draw && (draw.status === 'IN_PROGRESS' || draw.status === 'PAUSED');
  const isCompleted = draw && (draw.status === 'COMPLETED' || draw.status === 'FINALIZED');

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 20px 80px 20px', overflowX: 'hidden' }}>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            padding: '12px 18px',
            borderRadius: '8px',
            background: toast.type === 'success' ? '#065F46' : '#7F1D1D',
            color: '#F1F5F9',
            fontSize: '13px',
            fontWeight: 700,
            border: `1px solid ${toast.type === 'success' ? '#10B981' : '#EF4444'}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Top Ceremony Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid #1E2638',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            href="/tournament"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#10141E',
              border: '1px solid #1E2638',
              color: '#94A3B8',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            ← Tournament Hub
          </Link>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', color: '#C0272D', textTransform: 'uppercase' }}>
              OFFICIAL CEREMONY
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#F1F5F9', margin: '2px 0 0 0', letterSpacing: '-0.02em' }}>
              {tournamentName} — Digital Group Draw
            </h1>
          </div>
        </div>

        {/* Live / Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 800,
              background: isCompleted
                ? 'rgba(16, 185, 129, 0.15)'
                : isLive
                ? draw.status === 'PAUSED'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)'
                : 'rgba(148, 163, 184, 0.15)',
              color: isCompleted
                ? '#10B981'
                : isLive
                ? draw.status === 'PAUSED'
                  ? '#F59E0B'
                  : '#EF4444'
                : '#94A3B8',
              border: `1px solid ${
                isCompleted
                  ? '#10B981'
                  : isLive
                  ? draw.status === 'PAUSED'
                    ? '#F59E0B'
                    : '#EF4444'
                  : '#334155'
              }`,
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor' }} />
            {isCompleted
              ? 'GROUPS OFFICIAL ✓'
              : isLive
              ? draw.status === 'PAUSED'
                ? 'CEREMONY PAUSED'
                : 'CEREMONY LIVE'
              : 'WAITING FOR ADMIN'}
          </span>
        </div>
      </header>

      {/* Reveal Overlay Animation */}
      {revealedResult && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 13, 20, 0.9)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#10141E',
              borderRadius: '20px',
              border: '2px solid #C0272D',
              padding: '40px 24px',
              textAlign: 'center',
              maxWidth: '460px',
              width: '90%',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
            }}
          >
            <div style={{ fontSize: '54px', marginBottom: '16px' }}>📜</div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#C0272D', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
              CHIT #{revealedResult.pos} REVEALED
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#F1F5F9', margin: '0 0 16px 0' }}>
              {revealedResult.teamName}
            </h2>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px', letterSpacing: '0.05em' }}>
              OFFICIALLY ALLOCATED TO
            </div>
            <div
              style={{
                padding: '18px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #1E2638, #0A0D14)',
                border: '1px solid #38BDF8',
                fontSize: '32px',
                fontWeight: 900,
                color: '#38BDF8',
                letterSpacing: '0.05em',
              }}
            >
              {revealedResult.group}
            </div>
          </div>
        </div>
      )}

      {/* Active Captain Showcase / Broadcast Hero */}
      {isLive && (
        <div
          style={{
            marginBottom: '28px',
            padding: '28px 24px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.8))',
            borderRadius: '16px',
            border: '1px solid #334155',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', color: '#EF4444', textTransform: 'uppercase', marginBottom: '8px' }}>
            ● CURRENT ACTIVE PICK #{((draw.currentPickIndex || 0) + 1)} OF 9
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#F8FAFC', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            {draw.currentCaptain?.team?.name || 'Awaiting Next Pick'}
          </h2>
          <p style={{ fontSize: '14px', color: '#94A3B8', margin: 0 }}>
            Captain: <strong style={{ color: '#F1F5F9' }}>{draw.currentCaptain?.captainName}</strong>
          </p>

          {/* Captain Pass Quick Entry Box */}
          <div style={{ marginTop: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0A0D14', padding: '6px 12px', borderRadius: '8px', border: '1px solid #1E2638' }}>
            <span style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 700 }}>Captain Pass:</span>
            <input
              type="text"
              placeholder="e.g. KND-782"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.toUpperCase())}
              style={{
                background: '#10141E',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#38BDF8',
                fontFamily: 'monospace',
                fontWeight: 800,
                fontSize: '13px',
                width: '120px',
                textTransform: 'uppercase',
              }}
            />
            {passcode && (
              <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
                Unlocked ✓
              </span>
            )}
          </div>
        </div>
      )}

      {/* Digital Sealed Chit Bowl */}
      {isLive && (
        <div
          style={{
            marginBottom: '32px',
            padding: '28px 20px',
            background: '#10141E',
            borderRadius: '16px',
            border: '1px solid #1E2638',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#F1F5F9', margin: '0 0 6px 0' }}>
            Sealed Digital Chit Bowl
          </h3>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 auto 20px auto', maxWidth: '520px' }}>
            {passcode
              ? 'Tap any available sealed chit to open your tournament group.'
              : 'Enter your captain pass above to pick a chit, or watch live as picks are made.'}
          </p>

          {/* 9 Chits Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '16px',
              maxWidth: '860px',
              margin: '0 auto',
            }}
          >
            {draw.chits?.map((chit: any) => {
              const isSelected = chit.isRevealed;
              const isCurrentRevealing = revealingPos === chit.position;

              return (
                <button
                  key={chit.id}
                  onClick={() => handleSelectChit(chit.position)}
                  disabled={isSelected || draw.status === 'PAUSED' || loading}
                  style={{
                    minHeight: '110px',
                    padding: '18px 12px',
                    borderRadius: '12px',
                    background: isSelected
                      ? '#0A0D14'
                      : isCurrentRevealing
                      ? '#38BDF8'
                      : 'linear-gradient(135deg, #1E2638 0%, #10141E 100%)',
                    border: isSelected
                      ? '1px solid #1E2638'
                      : isCurrentRevealing
                      ? '2px solid #38BDF8'
                      : '1px solid #334155',
                    color: isSelected ? '#64748B' : '#F1F5F9',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: isSelected || draw.status === 'PAUSED' ? 'not-allowed' : 'pointer',
                    boxShadow: isSelected ? 'none' : '0 6px 18px rgba(0, 0, 0, 0.4)',
                    transition: 'all 0.2s ease',
                    opacity: isSelected ? 0.6 : 1,
                  }}
                >
                  <div style={{ fontSize: '26px' }}>
                    {isSelected ? '✓' : '🔒'}
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 800 }}>
                    CHIT #{chit.position < 10 ? `0${chit.position}` : chit.position}
                  </div>

                  <div style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? '#38BDF8' : '#94A3B8' }}>
                    {isSelected
                      ? chit.groupName === 'GROUP_A'
                        ? 'Group A'
                        : chit.groupName === 'GROUP_B'
                        ? 'Group B'
                        : 'Group C'
                      : 'SEALED'}
                  </div>

                  {isSelected && chit.selectedByTeam && (
                    <div style={{ fontSize: '10px', color: '#CBD5E1', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chit.selectedByTeam.shortName || chit.selectedByTeam.name}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Group Board */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#F1F5F9', margin: '0 0 16px 0' }}>
          Official Tournament Groups
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {(['GROUP_A', 'GROUP_B', 'GROUP_C'] as const).map((grpKey) => {
            const label = grpKey === 'GROUP_A' ? 'Group A' : grpKey === 'GROUP_B' ? 'Group B' : 'Group C';
            const assignedTeams = draw?.provisionalGroups?.[grpKey] || [];
            const color = grpKey === 'GROUP_A' ? '#38BDF8' : grpKey === 'GROUP_B' ? '#F472B6' : '#FBBF24';

            return (
              <div
                key={grpKey}
                style={{
                  background: '#10141E',
                  borderRadius: '12px',
                  border: `1px solid ${assignedTeams.length === 3 ? color : '#1E2638'}`,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '14px 18px',
                    background: '#0A0D14',
                    borderBottom: '1px solid #1E2638',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 800, color }}>{label}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>{assignedTeams.length}/3 Teams</span>
                </div>

                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[0, 1, 2].map((slotIdx) => {
                    const team = assignedTeams[slotIdx];
                    return (
                      <div
                        key={slotIdx}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          background: team ? '#0A0D14' : 'rgba(30, 41, 59, 0.2)',
                          border: team ? '1px solid #1E2638' : '1px dashed #334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        {team ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color, fontSize: '12px' }}>✓</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9' }}>
                              {team.name}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                            ○ Empty Slot {slotIdx + 1}
                          </span>
                        )}
                        {team && (
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            Chit #{team.chitPosition}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Draw History Audit List */}
      {draw?.drawHistory?.length > 0 && (
        <div
          style={{
            padding: '20px',
            background: '#10141E',
            borderRadius: '12px',
            border: '1px solid #1E2638',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#CBD5E1', margin: '0 0 12px 0' }}>
            Live Ceremony Timeline ({draw.drawHistory.length} of 9 picks)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {draw.drawHistory.map((h: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  background: '#0A0D14',
                  borderRadius: '6px',
                  border: '1px solid #1E2638',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, color: '#94A3B8' }}>#{idx + 1}</span>
                  <strong style={{ color: '#F1F5F9' }}>{h.team?.name}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#64748B' }}>Chit #{h.chitPosition}</span>
                  <span
                    style={{
                      fontWeight: 800,
                      color:
                        h.groupName === 'GROUP_A'
                          ? '#38BDF8'
                          : h.groupName === 'GROUP_B'
                          ? '#F472B6'
                          : '#FBBF24',
                    }}
                  >
                    → {h.groupName === 'GROUP_A' ? 'Group A' : h.groupName === 'GROUP_B' ? 'Group B' : 'Group C'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
