'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  assignTeamsToGroupsAction,
  generateGroupFixturesAction,
  configureTournamentStagesAction,
  advanceTournamentAction,
  recalculateStandingsAction,
  resetTournamentAction,
} from '@/lib/tournament/tournament-actions';
import { TournamentOverview } from '@/lib/tournament/tournament-service';

interface Props {
  tournament: any;
  overview: TournamentOverview | null;
  allTeams: Array<{ id: string; name: string; shortName: string; logoUrl?: string | null }>;
  stages: any[];
  entryPath: string;
}

export default function TournamentAdminConsole({
  tournament,
  overview,
  allTeams,
  stages,
  entryPath,
}: Props) {
  // Format settings state
  const groupStage = stages.find((s) => s.name === 'GROUP');
  const wildcardStage = stages.find((s) => s.name === 'WILDCARD');
  const playoffStage = stages.find((s) => s.name === 'PLAYOFFS');
  const finalStage = stages.find((s) => s.name === 'FINAL');

  const [ballsPerOver, setBallsPerOver] = useState(groupStage?.ballsPerOver || 4);
  const [groupOvers, setGroupOvers] = useState(groupStage?.oversPerInnings || 4);
  const [wildcardOvers, setWildcardOvers] = useState(wildcardStage?.oversPerInnings || 5);
  const [playoffOvers, setPlayoffOvers] = useState(playoffStage?.oversPerInnings || 6);
  const [finalOvers, setFinalOvers] = useState(finalStage?.oversPerInnings || 6);

  // Group assignment state
  const initialAssignments: Record<string, 'GROUP_A' | 'GROUP_B' | 'GROUP_C'> = {};
  if (overview) {
    overview.teams.forEach((t) => {
      if (t.groupName === 'GROUP_A' || t.groupName === 'GROUP_B' || t.groupName === 'GROUP_C') {
        initialAssignments[t.id] = t.groupName as any;
      }
    });
  }
  const [assignments, setAssignments] = useState<Record<string, 'GROUP_A' | 'GROUP_B' | 'GROUP_C'>>(initialAssignments);

  // Loading & notification states
  const [savingFormat, setSavingFormat] = useState(false);
  const [savingGroups, setSavingGroups] = useState(false);
  const [generatingFixtures, setGeneratingFixtures] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Architectural rule: Lock format once fixtures exist to prevent historical NRR inconsistencies
  const isLocked = Boolean(overview?.matches && overview.matches.length > 0);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  if (!tournament) {
    return (
      <div style={{ padding: '40px', background: '#1E293B', borderRadius: '12px', textAlign: 'center', color: '#94A3B8' }}>
        No active tournament found in the database. Please create a tournament first.
      </div>
    );
  }

  // Count assigned teams
  const groupACount = Object.values(assignments).filter((g) => g === 'GROUP_A').length;
  const groupBCount = Object.values(assignments).filter((g) => g === 'GROUP_B').length;
  const groupCCount = Object.values(assignments).filter((g) => g === 'GROUP_C').length;

  const handleSaveFormat = async () => {
    setSavingFormat(true);
    try {
      const res = await configureTournamentStagesAction(tournament.id, {
        ballsPerOver: Number(ballsPerOver),
        groupOvers: Number(groupOvers),
        wildcardOvers: Number(wildcardOvers),
        playoffOvers: Number(playoffOvers),
        finalOvers: Number(finalOvers),
      });
      if (res.success) {
        showToast('success', 'Tournament stage format configuration saved!');
      } else {
        showToast('error', 'Failed to save format configuration.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error saving format.');
    } finally {
      setSavingFormat(false);
    }
  };

  const handleSaveGroups = async () => {
    setSavingGroups(true);
    try {
      const res = await assignTeamsToGroupsAction(tournament.id, assignments);
      if (res.success) {
        showToast('success', 'Teams successfully assigned to Groups A, B, and C!');
      } else {
        showToast('error', res.error || 'Failed to save group assignments.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error saving groups.');
    } finally {
      setSavingGroups(false);
    }
  };

  const handleGenerateFixtures = async () => {
    if (groupACount < 3 || groupBCount < 3 || groupCCount < 3) {
      showToast('error', `Each group must have exactly 3 teams. Currently: A(${groupACount}), B(${groupBCount}), C(${groupCCount})`);
      return;
    }
    setGeneratingFixtures(true);
    try {
      const res = await generateGroupFixturesAction(tournament.id, {
        ballsPerOver: Number(ballsPerOver),
        groupOvers: Number(groupOvers),
        wildcardOvers: Number(wildcardOvers),
        playoffOvers: Number(playoffOvers),
        finalOvers: Number(finalOvers),
      });
      if (res.success) {
        showToast('success', '9 Group Stage fixtures successfully generated (Matches 1–9)!');
      } else {
        showToast('error', res.error || 'Failed to generate fixtures.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error generating fixtures.');
    } finally {
      setGeneratingFixtures(false);
    }
  };

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      const res = await advanceTournamentAction(tournament.id);
      if (res.advanced) {
        showToast('success', res.message);
      } else {
        showToast('error', res.message);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error checking advancement.');
    } finally {
      setAdvancing(false);
    }
  };  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await recalculateStandingsAction(tournament.id);
      if (res.success) {
        showToast('success', 'Ball-based NRR & standings successfully recalculated from raw match records!');
      } else {
        showToast('error', 'Failed to recalculate standings.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error recalculating.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleResetTournament = async () => {
    if (resetConfirmation !== 'RESET_TOURNAMENT') {
      showToast('error', 'Type "RESET_TOURNAMENT" exactly to confirm reset.');
      return;
    }
    setResetting(true);
    try {
      const res = await resetTournamentAction(tournament.id, resetConfirmation);
      if (res.success) {
        showToast('success', 'Tournament fixtures successfully reset. Format configuration is now unlocked!');
        setShowResetConfirm(false);
        setResetConfirmation('');
      } else {
        showToast('error', res.error || 'Failed to reset tournament fixtures.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error resetting fixtures.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: toast.type === 'success' ? '#34D399' : '#F87171',
            border: `1px solid ${toast.type === 'success' ? '#10B981' : '#EF4444'}`,
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Action Quick Bar */}
      <div
        style={{
          background: '#1E293B',
          borderRadius: '12px',
          border: '1px solid #334155',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#94A3B8' }}>Tournament Status:</span>
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, background: '#C0272D', color: '#FFF' }}>
            {tournament.status}
          </span>
          {overview && (
            <span style={{ fontSize: '13px', color: '#CBD5E1', marginLeft: '8px' }}>
              Stage: <strong>{overview.progress.currentStage}</strong> ({overview.progress.completedMatches}/{overview.progress.totalMatches} matches completed)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleAdvance}
            disabled={advancing}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#C0272D',
              color: '#FFF',
              fontWeight: 700,
              fontSize: '13px',
              cursor: advancing ? 'not-allowed' : 'pointer',
              opacity: advancing ? 0.7 : 1,
            }}
          >
            {advancing ? 'Checking...' : '⚡ Check & Advance Stage'}
          </button>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#10B981',
              color: '#FFF',
              fontWeight: 700,
              fontSize: '13px',
              cursor: recalculating ? 'not-allowed' : 'pointer',
              opacity: recalculating ? 0.7 : 1,
            }}
          >
            {recalculating ? 'Recalculating...' : '🔄 Recalculate Ball-Based NRR'}
          </button>
          <Link
            href="/tournament"
            target="_blank"
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #475569',
              background: '#0F172A',
              color: '#E2E8F0',
              fontWeight: 700,
              fontSize: '13px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>👁️</span> Public Tournament Hub ↗
          </Link>
        </div>
      </div>

      {/* Grid: Left = Format Config & Actions, Right = 9-Team Group Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Section 1: Tournament Format Settings */}
        <div style={{ background: '#1E293B', borderRadius: '12px', border: '1px solid #334155', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚙️</span>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Tournament Format & Over Limits
              </h2>
            </div>
            {isLocked ? (
              <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, background: 'rgba(234, 179, 8, 0.2)', color: '#FDE047', border: '1px solid #EAB308' }}>
                🔒 LOCKED (Active Fixtures)
              </span>
            ) : (
              <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid #10B981' }}>
                ✏️ DRAFT (Configurable)
              </span>
            )}
          </div>

          {isLocked ? (
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#FDE047', fontSize: '12px', lineHeight: 1.5, marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px' }}>🔒</span>
              <div>
                <strong>Format Locked:</strong> {overview?.matches?.length} matches are active. Match scorecards and ball-based NRR calculations inherit this configuration. To change format rules, use the <strong>Reset / Reconfigure Tournament</strong> action below.
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px' }}>
              Configured before fixtures are generated. Stored on each match for exact ball-based NRR calculation.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', opacity: isLocked ? 0.75 : 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                Legal Balls Per Over:
              </label>
              <select
                value={ballsPerOver}
                disabled={isLocked}
                onChange={(e) => setBallsPerOver(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', background: isLocked ? '#1E293B' : '#0F172A', border: '1px solid #475569', color: '#FFF', fontSize: '14px', cursor: isLocked ? 'not-allowed' : 'pointer' }}
              >
                <option value={4}>4 balls per over (CPL Softball Standard: 5 balls = 1.25 ov)</option>
                <option value={5}>5 balls per over (5 balls = 1.0 ov)</option>
                <option value={6}>6 balls per over (Standard Cricket)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                  Stage 1 (Groups) Overs:
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  disabled={isLocked}
                  value={groupOvers}
                  onChange={(e) => setGroupOvers(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: isLocked ? '#1E293B' : '#0F172A', border: '1px solid #475569', color: '#FFF', fontSize: '14px', cursor: isLocked ? 'not-allowed' : 'default' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                  Stage 2 (Wildcard) Overs:
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  disabled={isLocked}
                  value={wildcardOvers}
                  onChange={(e) => setWildcardOvers(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: isLocked ? '#1E293B' : '#0F172A', border: '1px solid #475569', color: '#FFF', fontSize: '14px', cursor: isLocked ? 'not-allowed' : 'default' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                  Stage 3 (Playoffs) Overs:
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  disabled={isLocked}
                  value={playoffOvers}
                  onChange={(e) => setPlayoffOvers(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: isLocked ? '#1E293B' : '#0F172A', border: '1px solid #475569', color: '#FFF', fontSize: '14px', cursor: isLocked ? 'not-allowed' : 'default' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                  Stage 4 (Final) Overs:
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  disabled={isLocked}
                  value={finalOvers}
                  onChange={(e) => setFinalOvers(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: isLocked ? '#1E293B' : '#0F172A', border: '1px solid #475569', color: '#FFF', fontSize: '14px', cursor: isLocked ? 'not-allowed' : 'default' }}
                />
              </div>
            </div>

            {!isLocked && (
              <button
                onClick={handleSaveFormat}
                disabled={savingFormat}
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#475569',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: savingFormat ? 'not-allowed' : 'pointer',
                }}
              >
                {savingFormat ? 'Saving Format...' : 'Save Format Configuration'}
              </button>
            )}
          </div>

          <hr style={{ borderColor: '#334155', margin: '24px 0' }} />

          {/* Fixture Generator Action */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 6px 0' }}>
              Generate Stage 1 Fixtures (Matches 1–9)
            </h3>
            {isLocked ? (
              <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#93C5FD', fontSize: '12px', lineHeight: 1.5, marginBottom: '14px' }}>
                ✅ Fixtures already generated. Stage 1 group matches (1–9) are active in the system.
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '14px' }}>
                Creates 3 round-robin matches per group at {ballsPerOver} balls/over and {groupOvers} overs.
              </p>
            )}
            <button
              onClick={handleGenerateFixtures}
              disabled={generatingFixtures || isLocked}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: 'none',
                background: isLocked ? '#334155' : '#C0272D',
                color: isLocked ? '#94A3B8' : '#FFF',
                fontWeight: 800,
                fontSize: '14px',
                cursor: (generatingFixtures || isLocked) ? 'not-allowed' : 'pointer',
                boxShadow: isLocked ? 'none' : '0 4px 12px rgba(192, 39, 45, 0.3)',
              }}
            >
              {isLocked ? '🔒 Fixtures Already Generated' : generatingFixtures ? 'Generating Fixtures...' : '🚀 Generate Group Stage Fixtures (1–9)'}
            </button>
          </div>
        </div>

        {/* Section 2: 9-Team Group Assignment */}
        <div style={{ background: '#1E293B', borderRadius: '12px', border: '1px solid #334155', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🛡️</span>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Group Stage Team Assignment
              </h2>
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
              Total Teams: <strong>{allTeams.length}</strong>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>
            Assign each registered team to Group A, B, or C. Each group must have exactly 3 teams.
          </p>

          {/* Group Count Badges */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ padding: '6px 12px', borderRadius: '6px', background: groupACount === 3 ? 'rgba(16, 185, 129, 0.15)' : '#334155', color: groupACount === 3 ? '#34D399' : '#CBD5E1', fontSize: '12px', fontWeight: 700 }}>
              Group A: {groupACount}/3
            </div>
            <div style={{ padding: '6px 12px', borderRadius: '6px', background: groupBCount === 3 ? 'rgba(16, 185, 129, 0.15)' : '#334155', color: groupBCount === 3 ? '#34D399' : '#CBD5E1', fontSize: '12px', fontWeight: 700 }}>
              Group B: {groupBCount}/3
            </div>
            <div style={{ padding: '6px 12px', borderRadius: '6px', background: groupCCount === 3 ? 'rgba(16, 185, 129, 0.15)' : '#334155', color: groupCCount === 3 ? '#34D399' : '#CBD5E1', fontSize: '12px', fontWeight: 700 }}>
              Group C: {groupCCount}/3
            </div>
          </div>

          {/* Team Assignment List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {allTeams.map((t) => {
              const currentGroup = assignments[t.id] || '';
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#0F172A',
                    border: '1px solid #334155',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9' }}>
                    {t.name} <span style={{ color: '#64748B', fontSize: '11px' }}>({t.shortName})</span>
                  </div>

                  <select
                    value={currentGroup}
                    disabled={isLocked}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setAssignments((prev) => {
                        const next = { ...prev };
                        if (val) {
                          next[t.id] = val;
                        } else {
                          delete next[t.id];
                        }
                        return next;
                      });
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      background: isLocked ? '#0B1120' : '#1E293B',
                      border: '1px solid #475569',
                      color: currentGroup ? '#38BDF8' : '#94A3B8',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <option value="">Unassigned</option>
                    <option value="GROUP_A">Group A</option>
                    <option value="GROUP_B">Group B</option>
                    <option value="GROUP_C">Group C</option>
                  </select>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSaveGroups}
            disabled={savingGroups || isLocked}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              background: isLocked ? '#334155' : '#38BDF8',
              color: isLocked ? '#94A3B8' : '#0F172A',
              fontWeight: 800,
              fontSize: '13px',
              cursor: (savingGroups || isLocked) ? 'not-allowed' : 'pointer',
            }}
          >
            {isLocked ? '🔒 Group Assignments Locked' : savingGroups ? 'Saving Assignments...' : 'Save Group Assignments'}
          </button>
        </div>
      </div>

      {/* Section 3: Safety & Reconfigure / Reset Tournament Card */}
      <div style={{ background: '#1E293B', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FCA5A5', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> Reconfigure / Reset Tournament Fixtures
            </h3>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, maxWidth: '720px', lineHeight: 1.5 }}>
              If you genuinely need to change balls per over, stage overs, or group assignments after fixtures are generated, you must reset the tournament fixtures. This removes generated match schedules while strictly preserving all team registrations and player rosters.
            </p>
          </div>

          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                padding: '10px 18px',
                borderRadius: '6px',
                border: '1px solid #EF4444',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ⚠️ Reset Fixtures & Unlock Format
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#0F172A', padding: '14px 18px', borderRadius: '8px', border: '1px solid #EF4444' }}>
              <div style={{ fontSize: '12px', color: '#FCA5A5', fontWeight: 700 }}>
                Type <span style={{ color: '#FFF', background: '#450A0A', padding: '2px 6px', borderRadius: '4px' }}>RESET_TOURNAMENT</span> to confirm:
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="RESET_TOURNAMENT"
                  value={resetConfirmation}
                  onChange={(e) => setResetConfirmation(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: '#1E293B', border: '1px solid #EF4444', color: '#FFF', fontSize: '13px', width: '180px' }}
                />
                <button
                  onClick={handleResetTournament}
                  disabled={resetting || resetConfirmation !== 'RESET_TOURNAMENT'}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: resetConfirmation === 'RESET_TOURNAMENT' ? '#EF4444' : '#64748B',
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: (resetting || resetConfirmation !== 'RESET_TOURNAMENT') ? 'not-allowed' : 'pointer',
                  }}
                >
                  {resetting ? 'Resetting...' : 'Confirm Reset'}
                </button>
                <button
                  onClick={() => {
                    setShowResetConfirm(false);
                    setResetConfirmation('');
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #475569',
                    background: '#1E293B',
                    color: '#CBD5E1',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
