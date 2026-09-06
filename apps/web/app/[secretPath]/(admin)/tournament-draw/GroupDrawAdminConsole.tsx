'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  generateDrawAction,
  startCeremonyAction,
  pauseCeremonyAction,
  resumeCeremonyAction,
  cancelDrawAction,
  revertFinalizedDrawAction,
  finalizeDrawAction,
  adminSelectChitAction,
  fetchDrawStateAction,
  verifyDrawCommitmentAction,
  attachTeamToTournamentAction,
} from '@/lib/tournament/draw-actions';

interface Props {
  tournament: any;
  initialDraw: any;
  eligibility: {
    teams: Array<any>;
    isEligible: boolean;
    currentCount: number;
    requiredCount: number;
  };
  allDbTeams: Array<any>;
  entryPath: string;
}

export default function GroupDrawAdminConsole({
  tournament,
  initialDraw,
  eligibility,
  allDbTeams,
  entryPath,
}: Props) {
  const [draw, setDraw] = useState<any>(initialDraw);
  const [teams, setTeams] = useState<any[]>(eligibility.teams);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() => {
    return (eligibility.teams || []).slice(0, 9).map((t: any) => t.id);
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Animation states
  const [revealingChitPos, setRevealingChitPos] = useState<number | null>(null);
  const [revealedResult, setRevealedResult] = useState<{ pos: number; group: string; teamName: string } | null>(null);

  // Passcode modal
  const [generatedPasscodes, setGeneratedPasscodes] = useState<Record<string, string> | null>(null);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);

  // Confirmation modals
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  // Commitment verification state
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  // Missing team addition state (for when DB has 8 teams)
  const [attachingTeamId, setAttachingTeamId] = useState<string>('');
  const [attachingLoading, setAttachingLoading] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Toggle selection for a team
  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      if (prev.includes(teamId)) {
        return prev.filter((id) => id !== teamId);
      } else {
        if (prev.length >= 9) {
          showToast('error', 'Only 9 teams can be selected for the draw ceremony. Deselect a team first.');
          return prev;
        }
        return [...prev, teamId];
      }
    });
  };

  const selectFirst9 = () => {
    setSelectedTeamIds((teams || []).slice(0, 9).map((t: any) => t.id));
    showToast('success', 'Selected the first 9 registered teams.');
  };

  const clearSelection = () => {
    setSelectedTeamIds([]);
  };

  // Sync state periodically during ceremony
  useEffect(() => {
    if (!draw || (draw.status !== 'IN_PROGRESS' && draw.status !== 'PAUSED')) return;
    const interval = setInterval(async () => {
      const res = await fetchDrawStateAction(tournament.id);
      if (res.success && res.draw) {
        setDraw(res.draw);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [draw?.status, tournament.id]);

  // Handle Generate Draw
  const handleGenerateDraw = async () => {
    if (selectedTeamIds.length !== 9) {
      showToast('error', `Exactly 9 teams must be selected for the official draw. Currently ${selectedTeamIds.length} selected.`);
      return;
    }
    setLoading(true);
    try {
      const res = await generateDrawAction(tournament.id, selectedTeamIds);
      if (!res.success) {
        showToast('error', res.error || 'Failed to generate draw.');
        return;
      }
      showToast('success', 'Official group draw generated and cryptographically committed!');
      const plainCodes = (res as any).plainPasscodes;
      if (plainCodes) {
        setGeneratedPasscodes(plainCodes);
        setShowPasscodeModal(true);
      }
      // Reload draw state
      const stateRes = await fetchDrawStateAction(tournament.id);
      if (stateRes.success && stateRes.draw) {
        setDraw(stateRes.draw);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error generating draw.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Start Ceremony
  const handleStartCeremony = async () => {
    if (!draw) return;
    setLoading(true);
    try {
      const res = await startCeremonyAction(draw.id);
      if (!res.success) {
        showToast('error', (res as any).error || 'Failed to start ceremony.');
        return;
      }
      showToast('success', 'Group draw ceremony is now LIVE! Captains can pick their chits.');
      const stateRes = await fetchDrawStateAction(tournament.id);
      if (stateRes.success && stateRes.draw) setDraw(stateRes.draw);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Pause / Resume
  const handleTogglePause = async () => {
    if (!draw) return;
    setLoading(true);
    try {
      if (draw.status === 'IN_PROGRESS') {
        const res = await pauseCeremonyAction(draw.id);
        if (res.success) showToast('success', 'Ceremony paused.');
      } else if (draw.status === 'PAUSED') {
        const res = await resumeCeremonyAction(draw.id);
        if (res.success) showToast('success', 'Ceremony resumed.');
      }
      const stateRes = await fetchDrawStateAction(tournament.id);
      if (stateRes.success && stateRes.draw) setDraw(stateRes.draw);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Cancel Draw
  const handleCancelDraw = async () => {
    if (!draw) return;
    setLoading(true);
    try {
      const res = await cancelDrawAction(draw.id);
      if (!res.success) {
        showToast('error', (res as any).error || 'Failed to cancel draw.');
        return;
      }
      showToast('success', 'Draw cancelled. Existing official tournament groups preserved.');
      setShowCancelConfirm(false);
      const stateRes = await fetchDrawStateAction(tournament.id);
      setDraw(stateRes.draw || null);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Admin Chit Selection (Host Mode)
  const handleSelectChit = async (pos: number) => {
    if (!draw || draw.status !== 'IN_PROGRESS' || loading || revealingChitPos !== null) return;
    setLoading(true);
    setRevealingChitPos(pos);

    try {
      const res = await adminSelectChitAction(draw.id, pos);
      if (!res.success) {
        showToast('error', res.error || 'Chit selection rejected.');
        setRevealingChitPos(null);
        return;
      }

      // Show reveal banner/animation
      const currentCap = draw.currentCaptain;
      setRevealedResult({
        pos,
        group: res.groupLabel,
        teamName: currentCap?.team?.name || 'Current Team',
      });

      // Animate for 1.8 seconds before refreshing board state
      setTimeout(async () => {
        setRevealingChitPos(null);
        setRevealedResult(null);
        const stateRes = await fetchDrawStateAction(tournament.id);
        if (stateRes.success && stateRes.draw) setDraw(stateRes.draw);
      }, 1800);
    } catch (err: any) {
      showToast('error', err.message);
      setRevealingChitPos(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle Finalize Draw
  const handleFinalizeDraw = async () => {
    if (!draw) return;
    setLoading(true);
    try {
      const res = await finalizeDrawAction(draw.id);
      if (!res.success) {
        showToast('error', res.error || 'Failed to finalize draw.');
        return;
      }
      showToast('success', 'Group assignments locked and committed as official tournament groups!');
      setShowFinalizeConfirm(false);
      const stateRes = await fetchDrawStateAction(tournament.id);
      if (stateRes.success && stateRes.draw) setDraw(stateRes.draw);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Revert Finalized Draw
  const handleRevertDraw = async () => {
    if (!draw) return;
    setLoading(true);
    try {
      const res = await revertFinalizedDrawAction(draw.id);
      if (!res.success) {
        showToast('error', (res as any).error || 'Failed to revert draw.');
        return;
      }
      showToast('success', 'Finalized draw reverted. Official group assignments have been cleared.');
      setShowRevertConfirm(false);
      const stateRes = await fetchDrawStateAction(tournament.id);
      setDraw(stateRes.draw || null);
      window.location.reload();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Cryptographic Commitment Verification
  const handleVerifyCommitment = async () => {
    if (!draw) return;
    setVerifying(true);
    try {
      const res = await verifyDrawCommitmentAction(draw.id);
      if (res.success) {
        setVerificationResult(res);
        showToast('success', 'Cryptographic verification confirmed! Commitment hash is 100% genuine.');
      } else {
        showToast('error', res.error || 'Verification failed.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setVerifying(false);
    }
  };

  // Helper: Attach 9th team if only 8 teams exist
  const handleAttachTeam = async () => {
    if (!attachingTeamId) return;
    setAttachingLoading(true);
    try {
      const res = await attachTeamToTournamentAction(tournament.id, attachingTeamId);
      if (res.success) {
        showToast('success', 'Team attached to tournament successfully! Refreshing...');
        window.location.reload();
      } else {
        showToast('error', res.error || 'Failed to attach team.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setAttachingLoading(false);
    }
  };

  // Find teams not yet attached
  const attachedTeamIds = new Set(teams.map((t) => t.id));
  const unattachedTeams = allDbTeams.filter((t) => !attachedTeamIds.has(t.id));

  // Determine stage
  const isReady = draw && draw.status === 'READY';
  const isLive = draw && (draw.status === 'IN_PROGRESS' || draw.status === 'PAUSED');
  const isCompleted = draw && draw.status === 'COMPLETED';
  const isFinalized = draw && draw.status === 'FINALIZED';
  const isPrepare = !draw || draw.status === 'DRAFT' || draw.status === 'CANCELLED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: toast.type === 'success' ? '#065F46' : '#7F1D1D',
            color: '#F1F5F9',
            fontSize: '13px',
            fontWeight: 600,
            border: `1px solid ${toast.type === 'success' ? '#10B981' : '#EF4444'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: '#F1F5F9', cursor: 'pointer', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Ceremony Progress Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 20px',
          background: '#10141E',
          borderRadius: '10px',
          border: '1px solid #1E2638',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              background: isFinalized
                ? 'rgba(16, 185, 129, 0.15)'
                : isCompleted
                ? 'rgba(234, 179, 8, 0.15)'
                : isLive
                ? draw.status === 'PAUSED'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)'
                : isReady
                ? 'rgba(56, 189, 248, 0.15)'
                : 'rgba(148, 163, 184, 0.15)',
              color: isFinalized
                ? '#10B981'
                : isCompleted
                ? '#EAB308'
                : isLive
                ? draw.status === 'PAUSED'
                  ? '#F59E0B'
                  : '#EF4444'
                : isReady
                ? '#38BDF8'
                : '#94A3B8',
              border: `1px solid ${
                isFinalized
                  ? '#10B981'
                  : isCompleted
                  ? '#EAB308'
                  : isLive
                  ? draw.status === 'PAUSED'
                    ? '#F59E0B'
                    : '#EF4444'
                  : isReady
                  ? '#38BDF8'
                  : '#334155'
              }`,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'currentColor',
              }}
            />
            {isFinalized
              ? 'FINALIZED & LOCKED'
              : isCompleted
              ? 'CEREMONY COMPLETE'
              : isLive
              ? draw.status === 'PAUSED'
                ? 'PAUSED'
                : 'CEREMONY LIVE'
              : isReady
              ? 'READY TO START'
              : 'DRAFT / NOT STARTED'}
          </span>

          <span style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 600 }}>
            {tournament.name} ({tournament.season})
          </span>
        </div>

        {/* Action Controls for Admin */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isLive && (
            <>
              <button
                onClick={handleTogglePause}
                disabled={loading}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: '#1E2638',
                  border: '1px solid #334155',
                  color: draw.status === 'PAUSED' ? '#10B981' : '#F59E0B',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {draw.status === 'PAUSED' ? '▶ Resume Draw' : '⏸ Pause Draw'}
              </button>

              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={loading}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel Ceremony
              </button>
            </>
          )}

          {isCompleted && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={loading}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#1E2638',
                border: '1px solid #334155',
                color: '#94A3B8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset & Redraw
            </button>
          )}

          {isReady && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={loading}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#1E2638',
                border: '1px solid #334155',
                color: '#94A3B8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset Draw
            </button>
          )}

          {isFinalized && (
            <button
              onClick={() => setShowRevertConfirm(true)}
              disabled={loading}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#EF4444',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>↺</span> Revert Finalized Draw
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: PRE-DRAW PREPARATION                                            */}
      {/* ========================================================================= */}
      {isPrepare && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Eligibility Banner */}
          <div
            style={{
              padding: '24px',
              background: '#10141E',
              borderRadius: '12px',
              border: `1px solid ${selectedTeamIds.length === 9 ? '#10B981' : '#F59E0B'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F1F5F9', margin: '0 0 6px 0' }}>
                  Tournament Draw Configuration {teams.length > 9 ? `(${teams.length} Teams Available)` : ''}
                </h2>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                  {teams.length > 9
                    ? `This tournament has ${teams.length} registered teams. Click team cards below to select the exact 9 teams that will enter the sealed-chit ceremony.`
                    : 'The digital sealed-chit ceremony requires exactly 9 registered teams, allocating 3 teams each to Group A, Group B, and Group C.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: selectedTeamIds.length === 9 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: `1px solid ${selectedTeamIds.length === 9 ? '#10B981' : '#F59E0B'}`,
                    color: selectedTeamIds.length === 9 ? '#10B981' : '#F59E0B',
                    fontWeight: 800,
                    fontSize: '13px',
                  }}
                >
                  {selectedTeamIds.length === 9
                    ? '✓ Exactly 9 Teams Selected'
                    : `⚠️ ${selectedTeamIds.length} of 9 Teams Selected (${9 - selectedTeamIds.length > 0 ? `${9 - selectedTeamIds.length} needed` : `${selectedTeamIds.length - 9} too many`})`}
                </div>

                {teams.length > 9 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={selectFirst9}
                      type="button"
                      style={{
                        padding: '6px 12px',
                        background: '#1E2638',
                        color: '#CBD5E1',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Select First 9
                    </button>
                    <button
                      onClick={clearSelection}
                      type="button"
                      style={{
                        padding: '6px 12px',
                        background: '#1E2638',
                        color: '#94A3B8',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Notice if < 9 */}
            {teams.length < 9 && (
              <div
                style={{
                  padding: '14px 18px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  color: '#FDE68A',
                  fontSize: '13px',
                  marginBottom: '16px',
                  lineHeight: '1.5',
                }}
              >
                <strong>Notice:</strong> Group draw requires at least 9 registered teams. Currently {teams.length} team(s) are attached to this tournament.
                {unattachedTeams.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#F1F5F9', fontWeight: 600 }}>Quick Attach 9th Team:</span>
                    <select
                      value={attachingTeamId}
                      onChange={(e) => setAttachingTeamId(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        background: '#0A0D14',
                        color: '#F1F5F9',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}
                    >
                      <option value="">Select official team to attach...</option>
                      {unattachedTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.shortName})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAttachTeam}
                      disabled={!attachingTeamId || attachingLoading}
                      style={{
                        padding: '6px 14px',
                        background: '#C0272D',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: attachingTeamId ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {attachingLoading ? 'Attaching...' : 'Attach Team'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Selectable Teams Grid */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#CBD5E1', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {teams.length > 9 ? `Click to Select 9 Teams (${selectedTeamIds.length}/9 Selected)` : `Eligible Teams (${teams.length})`}
                </h3>
                {teams.length > 9 && (
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Click any team to select or deselect
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '12px',
                }}
              >
                {teams.map((t, idx) => {
                  const isSelected = selectedTeamIds.includes(t.id);
                  const selectionOrder = selectedTeamIds.indexOf(t.id);

                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleTeamSelection(t.id)}
                      style={{
                        padding: '12px 16px',
                        background: isSelected ? 'rgba(56, 189, 248, 0.07)' : '#0A0D14',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid #38BDF8' : '1px solid #1E2638',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.12)' : 'none',
                      }}
                    >
                      {/* Checkbox badge */}
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: isSelected ? '#38BDF8' : '#1E2638',
                          color: isSelected ? '#0A0D14' : '#64748B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 900,
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected ? '✓' : idx + 1}
                      </div>

                      {t.logoUrl ? (
                        <img
                          src={t.logoUrl}
                          alt={t.name}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isSelected
                              ? 'linear-gradient(135deg, #0284C7, #1E2638)'
                              : 'linear-gradient(135deg, #C0272D, #1E2638)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#FFF',
                            flexShrink: 0,
                          }}
                        >
                          {t.shortName?.slice(0, 2) || t.name.slice(0, 2)}
                        </div>
                      )}

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#F1F5F9' : '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.name}
                          </div>
                          {isSelected && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                color: '#38BDF8',
                                background: 'rgba(56, 189, 248, 0.15)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                flexShrink: 0,
                              }}
                            >
                              #{selectionOrder + 1}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Captain: {t.captainName}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chit Pool Info */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              {['GROUP A', 'GROUP B', 'GROUP C'].map((grp) => (
                <div
                  key={grp}
                  style={{
                    padding: '14px',
                    background: '#0A0D14',
                    borderRadius: '8px',
                    border: '1px solid #1E2638',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#38BDF8', marginBottom: '4px' }}>
                    {grp}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#F1F5F9' }}>
                    3 Available Chits
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                    Slots 1, 2, 3
                  </div>
                </div>
              ))}
            </div>

            {/* Warning & Generate Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid #1E2638', paddingTop: '16px' }}>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                ⚠️ <em>Once the official draw begins, team assignments cannot be manually edited from this screen.</em>
              </p>

              <button
                onClick={handleGenerateDraw}
                disabled={selectedTeamIds.length !== 9 || loading}
                style={{
                  padding: '12px 24px',
                  background: selectedTeamIds.length === 9 ? 'linear-gradient(135deg, #C0272D, #991B1B)' : '#334155',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: selectedTeamIds.length === 9 ? 'pointer' : 'not-allowed',
                  boxShadow: selectedTeamIds.length === 9 ? '0 4px 14px rgba(192, 39, 45, 0.4)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {loading
                  ? 'Generating...'
                  : selectedTeamIds.length === 9
                  ? '🎲 Generate Official Draw (9 Selected)'
                  : `Select Exactly 9 Teams (${selectedTeamIds.length}/9)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: READY (Order Generated & Commitment Hash Displayed)              */}
      {/* ========================================================================= */}
      {isReady && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Commitment Box */}
          <div
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(16, 20, 30, 0.95), rgba(10, 13, 20, 0.95))',
              borderRadius: '12px',
              border: '1px solid #0284C7',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#38BDF8', textTransform: 'uppercase' }}>
                  CRYPTOGRAPHIC INTEGRITY GUARANTEE
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F9', margin: '4px 0 2px 0' }}>
                  Draw Commitment Hash
                </h3>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                  This SHA-256 hash proves the full chit allocation and captain order were locked before any captain selected a chit.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(draw.commitmentHash);
                    showToast('success', 'Commitment hash copied to clipboard!');
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#1E2638',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#38BDF8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📋 Copy Hash
                </button>
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px',
                background: '#0A0D14',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#38BDF8',
                wordBreak: 'break-all',
                border: '1px solid #1E2638',
              }}
            >
              {draw.commitmentHash}
            </div>
          </div>

          {/* Captain Order & Ceremony Launch */}
          <div
            style={{
              padding: '24px',
              background: '#10141E',
              borderRadius: '12px',
              border: '1px solid #1E2638',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F9', margin: '0 0 4px 0' }}>
                  Official Captain Drawing Order
                </h3>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                  Teams will step up to pick their sealed chit in this server-randomized order.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowPasscodeModal(true)}
                  style={{
                    padding: '8px 16px',
                    background: '#1E2638',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🔑 Captain Passcodes
                </button>

                <button
                  onClick={handleStartCeremony}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {loading ? 'Starting...' : '▶ Start Ceremony'}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '12px',
              }}
            >
              {draw.captainOrders?.map((co: any) => (
                <div
                  key={co.id}
                  style={{
                    padding: '12px 14px',
                    background: '#0A0D14',
                    borderRadius: '8px',
                    border: '1px solid #1E2638',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: co.position === 1 ? '#C0272D' : '#1E2638',
                      color: '#FFF',
                      fontSize: '13px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    #{co.position}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {co.team?.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      Captain: {co.captainName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: LIVE CEREMONY (Interactive Sealed Chit Bowl + Group Board)      */}
      {/* ========================================================================= */}
      {isLive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active Pick Showcase Card */}
          <div
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.7))',
              borderRadius: '12px',
              border: '1px solid #334155',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#EF4444', textTransform: 'uppercase', marginBottom: '4px' }}>
                  CURRENT ACTIVE PICK • #{((draw.currentPickIndex || 0) + 1)} OF 9
                </div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#F8FAFC', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                  {draw.currentCaptain?.team?.name || 'Awaiting Captain'}
                </h2>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                  Captain: <strong style={{ color: '#F1F5F9' }}>{draw.currentCaptain?.captainName}</strong> — Tap a sealed chit below to reveal assignment.
                </p>
              </div>

              {/* Informational Group Chit Counters */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ padding: '8px 14px', background: '#0A0D14', borderRadius: '8px', border: '1px solid #1E2638', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>GROUP A CHITS</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#38BDF8' }}>{draw.remainingCounts?.GROUP_A ?? 3} remaining</div>
                </div>
                <div style={{ padding: '8px 14px', background: '#0A0D14', borderRadius: '8px', border: '1px solid #1E2638', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>GROUP B CHITS</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#F472B6' }}>{draw.remainingCounts?.GROUP_B ?? 3} remaining</div>
                </div>
                <div style={{ padding: '8px 14px', background: '#0A0D14', borderRadius: '8px', border: '1px solid #1E2638', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>GROUP C CHITS</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#FBBF24' }}>{draw.remainingCounts?.GROUP_C ?? 3} remaining</div>
                </div>
              </div>
            </div>
          </div>

          {/* Reveal Animation Modal / Overlay */}
          {revealedResult && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(10, 13, 20, 0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  background: '#10141E',
                  borderRadius: '16px',
                  border: '2px solid #C0272D',
                  padding: '40px',
                  textAlign: 'center',
                  maxWidth: '440px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                  animation: 'zoomIn 0.3s ease',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📜</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#C0272D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  CHIT #{revealedResult.pos} UNFOLDED
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#F1F5F9', margin: '0 0 16px 0' }}>
                  {revealedResult.teamName}
                </h2>
                <div style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '16px' }}>
                  ASSIGNED TO
                </div>
                <div
                  style={{
                    padding: '16px 24px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #1E2638, #0A0D14)',
                    border: '1px solid #38BDF8',
                    fontSize: '28px',
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

          {/* Digital Sealed Chit Bowl */}
          <div
            style={{
              padding: '28px',
              background: '#10141E',
              borderRadius: '14px',
              border: '1px solid #1E2638',
              textAlign: 'center',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F9', margin: '0 0 6px 0' }}>
                Sealed Digital Chit Bowl (9 Chits)
              </h3>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                {draw.status === 'PAUSED'
                  ? '⏸ Ceremony is temporarily paused. Unpause to select.'
                  : 'Click any available sealed chit to open it on behalf of the captain, or have the captain pick via mobile.'}
              </p>
            </div>

            {/* Chits Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '16px',
                maxWidth: '900px',
                margin: '0 auto',
              }}
            >
              {draw.chits?.map((chit: any) => {
                const isSelected = chit.isRevealed;
                const isCurrentRevealing = revealingChitPos === chit.position;

                return (
                  <button
                    key={chit.id}
                    onClick={() => handleSelectChit(chit.position)}
                    disabled={isSelected || draw.status === 'PAUSED' || loading}
                    style={{
                      padding: '20px 12px',
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
                      gap: '8px',
                      cursor: isSelected || draw.status === 'PAUSED' ? 'not-allowed' : 'pointer',
                      boxShadow: isSelected
                        ? 'none'
                        : '0 6px 16px rgba(0, 0, 0, 0.4)',
                      transform: isCurrentRevealing ? 'scale(1.05)' : 'none',
                      transition: 'all 0.25s ease',
                      opacity: isSelected ? 0.6 : 1,
                    }}
                  >
                    <div style={{ fontSize: '24px' }}>
                      {isSelected ? '✓' : '🔒'}
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em' }}>
                      CHIT #{chit.position < 10 ? `0${chit.position}` : chit.position}
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isSelected ? '#38BDF8' : '#94A3B8',
                      }}
                    >
                      {isSelected
                        ? chit.groupName === 'GROUP_A'
                          ? 'Group A'
                          : chit.groupName === 'GROUP_B'
                          ? 'Group B'
                          : 'Group C'
                        : 'SEALED'}
                    </div>

                    {isSelected && chit.selectedByTeam && (
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#CBD5E1',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100px',
                        }}
                      >
                        {chit.selectedByTeam.shortName || chit.selectedByTeam.name}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Group Board */}
          <div
            style={{
              padding: '24px',
              background: '#10141E',
              borderRadius: '12px',
              border: '1px solid #1E2638',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F9', margin: '0 0 16px 0' }}>
              Live Official Groups Board
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
                const assignedTeams = draw.provisionalGroups?.[grpKey] || [];
                const color = grpKey === 'GROUP_A' ? '#38BDF8' : grpKey === 'GROUP_B' ? '#F472B6' : '#FBBF24';

                return (
                  <div
                    key={grpKey}
                    style={{
                      background: '#0A0D14',
                      borderRadius: '10px',
                      border: `1px solid ${assignedTeams.length === 3 ? color : '#1E2638'}`,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#10141E',
                        borderBottom: '1px solid #1E2638',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 800, color }}>
                        {label}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {assignedTeams.length}/3 Teams
                      </span>
                    </div>

                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[0, 1, 2].map((slotIdx) => {
                        const team = assignedTeams[slotIdx];
                        return (
                          <div
                            key={slotIdx}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '6px',
                              background: team ? '#10141E' : 'rgba(30, 41, 59, 0.2)',
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
          {draw.drawHistory?.length > 0 && (
            <div
              style={{
                padding: '20px',
                background: '#10141E',
                borderRadius: '12px',
                border: '1px solid #1E2638',
              }}
            >
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#CBD5E1', margin: '0 0 12px 0' }}>
                Chronological Draw Selections ({draw.drawHistory.length} of 9)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {draw.drawHistory.map((h: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 14px',
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
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: COMPLETED (All 9 Teams Assigned, Ready to Finalize)              */}
      {/* ========================================================================= */}
      {isCompleted && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              padding: '28px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(15, 23, 42, 0.8))',
              borderRadius: '12px',
              border: '2px solid #10B981',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏆</div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#F1F5F9', margin: '0 0 6px 0' }}>
              All 9 Teams Have Drawn!
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 auto 20px auto', maxWidth: '560px' }}>
              Review the final group allocation below. When ready, finalize this official draw to commit the assignments into the tournament bracket and fixture engine.
            </p>

            <button
              onClick={() => setShowFinalizeConfirm(true)}
              style={{
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
              }}
            >
              ✓ Finalize Official Groups
            </button>
          </div>

          {/* Group Summary Review */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {(['GROUP_A', 'GROUP_B', 'GROUP_C'] as const).map((grpKey) => {
              const label = grpKey === 'GROUP_A' ? 'Group A' : grpKey === 'GROUP_B' ? 'Group B' : 'Group C';
              const assignedTeams = draw.provisionalGroups?.[grpKey] || [];
              const color = grpKey === 'GROUP_A' ? '#38BDF8' : grpKey === 'GROUP_B' ? '#F472B6' : '#FBBF24';

              return (
                <div
                  key={grpKey}
                  style={{
                    background: '#10141E',
                    borderRadius: '10px',
                    border: `1px solid ${color}`,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '12px 16px', background: '#0A0D14', borderBottom: '1px solid #1E2638' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color }}>{label}</span>
                  </div>
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {assignedTeams.map((t: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          background: '#0A0D14',
                          borderRadius: '6px',
                          border: '1px solid #1E2638',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#F1F5F9',
                        }}
                      >
                        {idx + 1}. {t.name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 5: FINALIZED (Official Groups Committed)                            */}
      {/* ========================================================================= */}
      {isFinalized && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Finalized Banner */}
          <div
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(10, 13, 20, 0.9))',
              borderRadius: '12px',
              border: '1px solid #10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                AUTHORITATIVE GROUP ASSIGNMENT
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#F1F5F9', margin: '0 0 6px 0' }}>
                CPL Official Groups Locked ✓
              </h2>
              <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                These group assignments are committed in the database and active across the tournament bracket, fixtures, and NRR engine.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link
                href={`/${entryPath}/tournament-bracket`}
                style={{
                  padding: '10px 18px',
                  background: '#1E2638',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#F1F5F9',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                View 9-Team Bracket ↗
              </Link>
              <Link
                href={`/${entryPath}/matches`}
                style={{
                  padding: '10px 18px',
                  background: '#C0272D',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Match Center ↗
              </Link>
            </div>
          </div>

          {/* Group Review Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {(['GROUP_A', 'GROUP_B', 'GROUP_C'] as const).map((grpKey) => {
              const label = grpKey === 'GROUP_A' ? 'Group A' : grpKey === 'GROUP_B' ? 'Group B' : 'Group C';
              const assignedTeams = draw.provisionalGroups?.[grpKey] || [];
              const color = grpKey === 'GROUP_A' ? '#38BDF8' : grpKey === 'GROUP_B' ? '#F472B6' : '#FBBF24';

              return (
                <div
                  key={grpKey}
                  style={{
                    background: '#10141E',
                    borderRadius: '10px',
                    border: `1px solid ${color}`,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      background: '#0A0D14',
                      borderBottom: '1px solid #1E2638',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 800, color }}>{label}</span>
                    <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>OFFICIAL ✓</span>
                  </div>
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {assignedTeams.map((t: any, idx: number) => (
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
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#F1F5F9',
                        }}
                      >
                        <span>{idx + 1}. {t.name}</span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>Chit #{t.chitPosition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cryptographic Proof Verification Card */}
          <div
            style={{
              padding: '24px',
              background: '#10141E',
              borderRadius: '12px',
              border: '1px solid #1E2638',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F9', margin: '0 0 4px 0' }}>
                  Independent Cryptographic Verification
                </h3>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                  The secret salt is now revealed. You can independently recalculate SHA-256(Draw Payload) to prove the outcome was never altered.
                </p>
              </div>

              <button
                onClick={handleVerifyCommitment}
                disabled={verifying}
                style={{
                  padding: '8px 16px',
                  background: '#1E2638',
                  border: '1px solid #0284C7',
                  borderRadius: '6px',
                  color: '#38BDF8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {verifying ? 'Verifying...' : '⚡ Verify Commitment'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '10px 14px', background: '#0A0D14', borderRadius: '6px', border: '1px solid #1E2638' }}>
                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, marginBottom: '2px' }}>COMMITMENT HASH (PRE-DRAW)</div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#38BDF8', wordBreak: 'break-all' }}>
                  {draw.commitmentHash}
                </div>
              </div>

              <div style={{ padding: '10px 14px', background: '#0A0D14', borderRadius: '6px', border: '1px solid #1E2638' }}>
                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, marginBottom: '2px' }}>REVEALED SECRET SALT (POST-FINALIZATION)</div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#10B981', wordBreak: 'break-all' }}>
                  {draw.secretSalt || 'REVEALED'}
                </div>
              </div>
            </div>

            {verificationResult && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: verificationResult.isValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${verificationResult.isValid ? '#10B981' : '#EF4444'}`,
                  color: verificationResult.isValid ? '#10B981' : '#EF4444',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                {verificationResult.isValid
                  ? '✓ HASH MATCH CONFIRMED: SHA256(CanonicalPayload) matches stored commitment hash.'
                  : '✕ INTEGRITY MISMATCH: Hash does not match stored commitment.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CAPTAIN PASSCODES MODAL                                                   */}
      {/* ========================================================================= */}
      {showPasscodeModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#10141E',
              borderRadius: '12px',
              border: '1px solid #334155',
              padding: '24px',
              maxWidth: '560px',
              width: '90%',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#F1F5F9', margin: 0 }}>
                🔑 Captain Draw Passcodes
              </h3>
              <button
                onClick={() => setShowPasscodeModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px' }}>
              Provide each captain with their designated pass code. They will use this on their phone at <strong>/tournament/draw</strong> to unlock their turn and select a chit.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {draw?.captainOrders?.map((co: any) => {
                const plain = generatedPasscodes?.[co.teamId] || '••••••';
                return (
                  <div
                    key={co.id}
                    style={{
                      padding: '10px 14px',
                      background: '#0A0D14',
                      borderRadius: '6px',
                      border: '1px solid #1E2638',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, color: '#64748B', marginRight: '8px' }}>#{co.position}</span>
                      <strong style={{ color: '#F1F5F9' }}>{co.team?.name}</strong>
                      <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '6px' }}>({co.captainName})</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          color: '#38BDF8',
                          background: '#1E2638',
                          padding: '4px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {plain}
                      </span>
                      {plain !== '••••••' && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(plain);
                            showToast('success', `Copied pass for ${co.team?.name}!`);
                          }}
                          style={{
                            padding: '4px 8px',
                            background: '#1E2638',
                            border: '1px solid #334155',
                            borderRadius: '4px',
                            color: '#94A3B8',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPasscodeModal(false)}
                style={{
                  padding: '8px 18px',
                  background: '#1E2638',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F1F5F9',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANCEL CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {showCancelConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#10141E',
              borderRadius: '12px',
              border: '1px solid #EF4444',
              padding: '24px',
              maxWidth: '440px',
              width: '90%',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#EF4444', margin: '0 0 10px 0' }}>
              Cancel Ceremony?
            </h3>
            <p style={{ fontSize: '13px', color: '#CBD5E1', marginBottom: '20px', lineHeight: '1.5' }}>
              Cancelling this ceremony will discard all current provisional selections. Official tournament groups will remain untouched.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{
                  padding: '8px 16px',
                  background: '#1E2638',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F1F5F9',
                  cursor: 'pointer',
                }}
              >
                Keep Ceremony
              </button>
              <button
                onClick={handleCancelDraw}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: '#EF4444',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#FFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FINALIZE CONFIRMATION MODAL                                               */}
      {/* ========================================================================= */}
      {showFinalizeConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#10141E',
              borderRadius: '12px',
              border: '1px solid #10B981',
              padding: '24px',
              maxWidth: '480px',
              width: '90%',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#10B981', margin: '0 0 10px 0' }}>
              Finalize Official Groups?
            </h3>
            <p style={{ fontSize: '13px', color: '#CBD5E1', marginBottom: '20px', lineHeight: '1.5' }}>
              Finalizing this draw will make these group assignments official and will initialize the tournament group-stage structure using these assignments. This action cannot be casually undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowFinalizeConfirm(false)}
                style={{
                  padding: '8px 16px',
                  background: '#1E2638',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F1F5F9',
                  cursor: 'pointer',
                }}
              >
                Review Again
              </button>
              <button
                onClick={handleFinalizeDraw}
                disabled={loading}
                style={{
                  padding: '8px 18px',
                  background: '#10B981',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#FFF',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Finalizing...' : 'Yes, Commit Official Groups'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVERT FINALIZED DRAW CONFIRMATION MODAL                                  */}
      {/* ========================================================================= */}
      {showRevertConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#10141E',
              borderRadius: '12px',
              border: '1px solid #EF4444',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#EF4444', margin: 0 }}>
                Revert Finalized Tournament Draw?
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#CBD5E1', marginBottom: '14px', lineHeight: '1.6' }}>
              Are you sure you want to revert this official group draw? This will:
            </p>
            <ul style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '18px', paddingLeft: '20px', lineHeight: '1.6' }}>
              <li>Clear all official group assignments (<strong style={{ color: '#F1F5F9' }}>Group A, Group B, Group C</strong>) from the tournament table.</li>
              <li>Reset the ceremony back to <strong style={{ color: '#38BDF8' }}>Stage 1 (Pre-draw)</strong> so you can conduct or test a new draw.</li>
              <li>Record a permanent administrative revert entry in the immutable audit log.</li>
            </ul>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#FCA5A5',
                fontSize: '12px',
                marginBottom: '20px',
                lineHeight: '1.5',
              }}
            >
              🔒 <strong>Safety Guard:</strong> If any tournament matches have already been scored or completed, this action will be strictly blocked to safeguard active tournament statistics.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowRevertConfirm(false)}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: '#1E2638',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F1F5F9',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Keep Finalized Draw
              </button>
              <button
                onClick={handleRevertDraw}
                disabled={loading}
                style={{
                  padding: '8px 18px',
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#FFF',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                }}
              >
                {loading ? 'Reverting...' : 'Confirm Revert & Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
