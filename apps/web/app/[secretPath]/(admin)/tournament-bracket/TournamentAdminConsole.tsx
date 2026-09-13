'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  assignTeamsToGroupsAction,
  unassignAllTeamsAction,
  generateGroupFixturesAction,
  configureTournamentStagesAction,
  advanceTournamentAction,
  recalculateStandingsAction,
  resetTournamentAction,
  updateTournamentFormatAction,
} from '@/lib/tournament/tournament-actions';
import { TournamentOverview } from '@/lib/tournament/tournament-service';
import {
  TournamentFormatType,
  TOURNAMENT_FORMAT_CONFIGS,
  getFormatConfig,
  resolveTournamentFormat,
} from '@/lib/tournament/tournament-formats';

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
  // Tournament format state
  const [tournamentFormat, setTournamentFormat] = useState<TournamentFormatType>(() => {
    return resolveTournamentFormat(overview?.tournamentFormat || tournament.tournamentFormat || tournament.format);
  });
  const [updatingFormat, setUpdatingFormat] = useState(false);

  useEffect(() => {
    if (overview?.tournamentFormat || tournament.tournamentFormat) {
      setTournamentFormat(resolveTournamentFormat(overview?.tournamentFormat || tournament.tournamentFormat));
    }
  }, [overview, tournament]);

  const activeFormatConfig = getFormatConfig(tournamentFormat);
  const requiredGroupA = activeFormatConfig.groupA;
  const requiredGroupB = activeFormatConfig.groupB;
  const totalRequiredTeams = activeFormatConfig.totalTeams;
  const totalGroupMatches = activeFormatConfig.groupMatches;

  // Format settings state
  const groupStage = stages.find((s) => s.name === 'GROUP');
  const qualStage = stages.find((s) => s.name === 'QUALIFICATION' || s.name === 'WILDCARD');
  const playoffStage = stages.find((s) => s.name === 'PLAYOFFS');
  const finalStage = stages.find((s) => s.name === 'FINAL');

  const [ballsPerOver, setBallsPerOver] = useState(groupStage?.ballsPerOver || 4);
  const [groupOvers, setGroupOvers] = useState(groupStage?.oversPerInnings || 4);
  const [qualificationOvers, setQualificationOvers] = useState(qualStage?.oversPerInnings || 5);
  const [playoffOvers, setPlayoffOvers] = useState(playoffStage?.oversPerInnings || 6);
  const [finalOvers, setFinalOvers] = useState(finalStage?.oversPerInnings || 6);

  // Group assignment state: Group A (A1-A4) and Group B (B1-B4)
  const initialAssignments: Record<string, 'GROUP_A' | 'GROUP_B'> = {};
  const initialPositions: Record<string, number> = {};

  if (overview) {
    overview.teams.forEach((t) => {
      if (t.groupName === 'GROUP_A' || t.groupName === 'GROUP_B') {
        initialAssignments[t.id] = t.groupName as 'GROUP_A' | 'GROUP_B';
        if (t.seed) {
          initialPositions[t.id] = t.seed;
        }
      }
    });
  }
  const [assignments, setAssignments] = useState<Record<string, 'GROUP_A' | 'GROUP_B'>>(initialAssignments);
  const [positions, setPositions] = useState<Record<string, number>>(initialPositions);

  useEffect(() => {
    if (overview?.teams) {
      const nextAss: Record<string, 'GROUP_A' | 'GROUP_B'> = {};
      const nextPos: Record<string, number> = {};
      overview.teams.forEach((t) => {
        if (t.groupName === 'GROUP_A' || t.groupName === 'GROUP_B') {
          nextAss[t.id] = t.groupName as 'GROUP_A' | 'GROUP_B';
          if (t.seed) {
            nextPos[t.id] = t.seed;
          }
        }
      });
      if (Object.keys(nextAss).length > 0) {
        setAssignments(nextAss);
        setPositions(nextPos);
      }
    }
  }, [overview]);

  // Loading & notification states
  const [savingFormat, setSavingFormat] = useState(false);
  const [savingGroups, setSavingGroups] = useState(false);
  const [generatingFixtures, setGeneratingFixtures] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
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

  const handleGroupChange = (teamId: string, group: 'GROUP_A' | 'GROUP_B' | '') => {
    if (!group) {
      setAssignments((prev) => {
        const next = { ...prev };
        delete next[teamId];
        return next;
      });
      setPositions((prev) => {
        const next = { ...prev };
        delete next[teamId];
        return next;
      });
      return;
    }

    setAssignments((prev) => ({ ...prev, [teamId]: group }));

    // Auto-allocate next available position in this group (1..maxPos)
    const maxPos = group === 'GROUP_A' ? requiredGroupA : requiredGroupB;
    const existingInGroup = Object.entries(assignments)
      .filter(([id, g]) => g === group && id !== teamId)
      .map(([id]) => positions[id])
      .filter(Boolean);

    let nextPos = 1;
    for (let p = 1; p <= maxPos; p++) {
      if (!existingInGroup.includes(p)) {
        nextPos = p;
        break;
      }
    }
    setPositions((prev) => ({ ...prev, [teamId]: nextPos }));
  };

  const handlePositionChange = (teamId: string, pos: number) => {
    setPositions((prev) => ({ ...prev, [teamId]: pos }));
  };

  const handleFormatChange = async (newFormat: TournamentFormatType) => {
    if (isLocked) {
      showToast('error', 'Format cannot be changed while fixtures are active. Reset fixtures first.');
      return;
    }
    setUpdatingFormat(true);
    try {
      const res = await updateTournamentFormatAction(tournament.id, newFormat);
      if (res.success) {
        setTournamentFormat(newFormat);
        showToast('success', `Tournament format updated to ${TOURNAMENT_FORMAT_CONFIGS[newFormat].name}!`);
      } else {
        showToast('error', res.error || 'Failed to update tournament format.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating format.');
    } finally {
      setUpdatingFormat(false);
    }
  };

  const handleAutoAssign = () => {
    const realTeams = allTeams.filter(
      (t) => !t.name.toLowerCase().includes('dummy') && !t.shortName.toLowerCase().includes('dummy')
    );
    const targetTeams = realTeams.length >= totalRequiredTeams 
      ? realTeams.slice(0, totalRequiredTeams) 
      : allTeams.slice(0, totalRequiredTeams);

    const nextAss: Record<string, 'GROUP_A' | 'GROUP_B'> = {};
    const nextPos: Record<string, number> = {};

    targetTeams.slice(0, requiredGroupA).forEach((t, idx) => {
      nextAss[t.id] = 'GROUP_A';
      nextPos[t.id] = idx + 1;
    });
    targetTeams.slice(requiredGroupA, requiredGroupA + requiredGroupB).forEach((t, idx) => {
      nextAss[t.id] = 'GROUP_B';
      nextPos[t.id] = idx + 1;
    });

    setAssignments(nextAss);
    setPositions(nextPos);
    showToast(
      'success',
      `Auto-assigned ${totalRequiredTeams} teams (${requiredGroupA} in Group A, ${requiredGroupB} in Group B). Click "Save Group Assignments" to persist.`
    );
  };

  const handleUnassignAll = async () => {
    setUnassigning(true);
    try {
      const res = await unassignAllTeamsAction(tournament.id);
      if (res.success) {
        setAssignments({});
        setPositions({});
        showToast('success', 'All teams successfully unassigned from groups.');
      } else {
        showToast('error', res.error || 'Failed to unassign teams.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error unassigning teams.');
    } finally {
      setUnassigning(false);
    }
  };

  const handleSaveFormat = async () => {
    setSavingFormat(true);
    try {
      const res = await configureTournamentStagesAction(tournament.id, {
        ballsPerOver: Number(ballsPerOver),
        groupOvers: Number(groupOvers),
        ...(tournamentFormat === '6_TEAM' ? { wildcardOvers: Number(qualificationOvers) } : {}),
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
    if (groupACount !== requiredGroupA || groupBCount !== requiredGroupB) {
      showToast(
        'error',
        `Format requires ${requiredGroupA} teams in Group A and ${requiredGroupB} in Group B. Currently: Group A (${groupACount}/${requiredGroupA}), Group B (${groupBCount}/${requiredGroupB})`
      );
      return;
    }

    // Ensure every assigned team has an explicit position
    const finalizedPositions = { ...positions };
    Object.keys(assignments).forEach((teamId) => {
      if (!finalizedPositions[teamId]) {
        finalizedPositions[teamId] = 1;
      }
    });

    setSavingGroups(true);
    try {
      const res = await assignTeamsToGroupsAction(tournament.id, assignments, finalizedPositions);
      if (res.success) {
        showToast('success', 'Teams successfully assigned to Groups A and B!');
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
    if (groupACount !== requiredGroupA || groupBCount !== requiredGroupB) {
      showToast(
        'error',
        `Each group must be filled before generating fixtures. Currently: Group A (${groupACount}/${requiredGroupA}), Group B (${groupBCount}/${requiredGroupB})`
      );
      return;
    }
    setGeneratingFixtures(true);
    try {
      const res = await generateGroupFixturesAction(tournament.id, {
        ballsPerOver: Number(ballsPerOver),
        groupOvers: Number(groupOvers),
        ...(tournamentFormat === '6_TEAM' ? { wildcardOvers: Number(qualificationOvers) } : {}),
        playoffOvers: Number(playoffOvers),
        finalOvers: Number(finalOvers),
      });
      if (res.success) {
        showToast('success', `${totalGroupMatches} Group Stage fixtures successfully generated (Matches 1–${totalGroupMatches})!`);
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
  };

  const handleRecalculate = async () => {
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

      {/* Section 0: Tournament Format Selector Card */}
      <div style={{ background: '#1E293B', borderRadius: '12px', border: '1px solid #334155', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏆</span> Tournament Format & Team Configuration
            </h2>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
              Select the tournament structure. Once fixtures are generated, the format is locked to protect historical data and NRR records.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>Active Format:</span>
            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, background: '#C0272D', color: '#FFF' }}>
              {activeFormatConfig.name} ({activeFormatConfig.totalMatches} Matches)
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {(['6_TEAM', '7_TEAM', '8_TEAM'] as TournamentFormatType[]).map((fmt) => {
            const config = TOURNAMENT_FORMAT_CONFIGS[fmt];
            const isSelected = tournamentFormat === fmt;
            return (
              <div
                key={fmt}
                onClick={() => !isLocked && !updatingFormat && handleFormatChange(fmt)}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: isSelected ? 'rgba(192, 39, 45, 0.15)' : '#0F172A',
                  border: isSelected ? '2px solid #C0272D' : '1px solid #334155',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked && !isSelected ? 0.45 : 1,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: isSelected ? '#FFF' : '#CBD5E1' }}>
                    {config.name}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: '11px', background: '#C0272D', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      Selected
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: 1.4, marginBottom: '8px' }}>
                  {config.description}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '10px' }}>
                  <span style={{ background: '#1E293B', padding: '2px 6px', borderRadius: '4px', color: '#38BDF8' }}>
                    Group A: {config.groupA} Teams
                  </span>
                  <span style={{ background: '#1E293B', padding: '2px 6px', borderRadius: '4px', color: '#38BDF8' }}>
                    Group B: {config.groupB} Teams
                  </span>
                  <span style={{ background: '#1E293B', padding: '2px 6px', borderRadius: '4px', color: '#FBBF24' }}>
                    {config.totalMatches} Matches Total
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Left = Format Config & Actions, Right = Team Group Selector */}
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

            {tournamentFormat === '6_TEAM' ? (
              <>
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
                      value={qualificationOvers}
                      onChange={(e) => setQualificationOvers(Number(e.target.value))}
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
                      Final Stage Overs:
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
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
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
                    Stage 2 (Playoffs) Overs:
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
                    Final Stage Overs:
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
            )}

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
              Generate Stage 1 Fixtures (Matches 1–{totalGroupMatches})
            </h3>
            {isLocked ? (
              <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#93C5FD', fontSize: '12px', lineHeight: 1.5, marginBottom: '14px' }}>
                ✅ Fixtures already generated. Stage 1 group matches (1–{totalGroupMatches}) are active in the system.
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '14px' }}>
                Creates {totalGroupMatches} group matches ({tournamentFormat === '8_TEAM' ? '6 in Group A, 6 in Group B' : requiredGroupA === requiredGroupB ? `${totalGroupMatches / 2} per group` : `${requiredGroupA} in Group A, ${requiredGroupB} in Group B`}) at {ballsPerOver} balls/over and {groupOvers} overs.
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
              {isLocked ? '🔒 Fixtures Already Generated' : generatingFixtures ? 'Generating Fixtures...' : `🚀 Generate Group Stage Fixtures (1–${totalGroupMatches})`}
            </button>
          </div>
        </div>

        {/* Section 2: Team Group Assignment */}
        <div style={{ background: '#1E293B', borderRadius: '12px', border: '1px solid #334155', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🛡️</span>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Group Stage Team Assignment
              </h2>
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
              Total Teams: <strong>{allTeams.length}</strong> (Target: {totalRequiredTeams})
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>
            Assign registered teams to Group A (A1–A{requiredGroupA}) or Group B (B1–B{requiredGroupB}). Exactly {requiredGroupA} in Group A and {requiredGroupB} in Group B.
          </p>

          {/* Group Count Badges & Auto-Assign Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ padding: '6px 12px', borderRadius: '6px', background: groupACount === requiredGroupA ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: groupACount === requiredGroupA ? '#34D399' : '#F87171', border: groupACount === requiredGroupA ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', fontSize: '12px', fontWeight: 700 }}>
                Group A: {groupACount}/{requiredGroupA}
              </div>
              <div style={{ padding: '6px 12px', borderRadius: '6px', background: groupBCount === requiredGroupB ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: groupBCount === requiredGroupB ? '#34D399' : '#F87171', border: groupBCount === requiredGroupB ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', fontSize: '12px', fontWeight: 700 }}>
                Group B: {groupBCount}/{requiredGroupB}
              </div>
            </div>

            {!isLocked && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleAutoAssign}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #38BDF8',
                    background: 'rgba(56, 189, 248, 0.1)',
                    color: '#38BDF8',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Auto-Assign {totalRequiredTeams} Teams
                </button>
                <button
                  type="button"
                  onClick={handleUnassignAll}
                  disabled={unassigning}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #94A3B8',
                    background: 'rgba(148, 163, 184, 0.1)',
                    color: '#CBD5E1',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: unassigning ? 'not-allowed' : 'pointer',
                    opacity: unassigning ? 0.6 : 1,
                  }}
                >
                  {unassigning ? 'Unassigning...' : '🔄 Unassign All Teams'}
                </button>
              </div>
            )}
          </div>

          {/* Team Assignment List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {allTeams.map((t) => {
              const currentGroup = assignments[t.id] || '';
              const currentPos = positions[t.id] || 1;

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
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9', flex: 1 }}>
                    {t.name} <span style={{ color: '#64748B', fontSize: '11px' }}>({t.shortName})</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <select
                      value={currentGroup}
                      disabled={isLocked}
                      onChange={(e) => handleGroupChange(t.id, e.target.value as any)}
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
                    </select>

                    {currentGroup && (
                      <select
                        value={currentPos}
                        disabled={isLocked}
                        onChange={(e) => handlePositionChange(t.id, Number(e.target.value))}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          background: isLocked ? '#0B1120' : '#1E293B',
                          border: '1px solid #475569',
                          color: '#FBBF24',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {Array.from({ length: currentGroup === 'GROUP_A' ? requiredGroupA : requiredGroupB }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>
                            {currentGroup === 'GROUP_A' ? `A${num}` : `B${num}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
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
              background: isLocked ? '#334155' : (groupACount === requiredGroupA && groupBCount === requiredGroupB) ? '#38BDF8' : '#475569',
              color: isLocked ? '#94A3B8' : (groupACount === requiredGroupA && groupBCount === requiredGroupB) ? '#0F172A' : '#CBD5E1',
              fontWeight: 800,
              fontSize: '13px',
              cursor: (savingGroups || isLocked) ? 'not-allowed' : 'pointer',
            }}
          >
            {isLocked
              ? '🔒 Group Assignments Locked'
              : savingGroups
              ? 'Saving Assignments...'
              : (groupACount === requiredGroupA && groupBCount === requiredGroupB)
              ? 'Save Group Assignments'
              : `Assign Teams (${groupACount}/${requiredGroupA} in A & ${groupBCount}/${requiredGroupB} in B)`}
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
              If you need to change balls per over, stage overs, or group assignments after fixtures are generated, you must reset the tournament fixtures. This removes generated match schedules while strictly preserving all team registrations and player rosters.
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
