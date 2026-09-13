'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createMatchAction, startMatchAction } from '@/lib/scoring/scoring-actions';

interface Tournament {
  id: string;
  name: string;
  season?: string;
  tournamentFormat?: string;
  stages?: Array<{ oversPerInnings?: number; ballsPerOver?: number }>;
}

interface Team {
  id: string;
  name: string;
  shortName?: string;
  logoUrl?: string | null;
  city?: string | null;
}

interface Props {
  tournaments: Tournament[];
  teams: Team[];
  entryPath: string;
}

export default function NewMatchForm({ tournaments, teams, entryPath }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [tournamentId, setTournamentId] = useState<string>(tournaments[0]?.id || '');
  const [teamAId, setTeamAId] = useState<string>('');
  const [teamBId, setTeamBId] = useState<string>('');
  const firstStage = tournaments[0]?.stages?.[0];
  const [oversPerInnings, setOversPerInnings] = useState<number>(firstStage?.oversPerInnings || 6);
  const [ballsPerOver, setBallsPerOver] = useState<number>(firstStage?.ballsPerOver || 6);

  // Match Designation & Stage
  const [stage, setStage] = useState<string>('GROUP');
  const [matchName, setMatchName] = useState<string>('Group Stage M1');
  const [groupName, setGroupName] = useState<string>('GROUP_A');
  const [matchNumber, setMatchNumber] = useState<string>('1');

  const [startImmediately, setStartImmediately] = useState<boolean>(true);
  const [tossWinnerChoice, setTossWinnerChoice] = useState<'TEAM_A' | 'TEAM_B'>('TEAM_A');
  const [tossDecision, setTossDecision] = useState<'BAT' | 'BOWL'>('BAT');

  const selectedTeamA = teams.find((t) => t.id === teamAId);
  const selectedTeamB = teams.find((t) => t.id === teamBId);

  const winningTeamDisplayName =
    tossWinnerChoice === 'TEAM_A'
      ? selectedTeamA?.name || 'Team A'
      : selectedTeamB?.name || 'Team B';

  const selectedTourn = tournaments.find((t) => t.id === tournamentId);
  const tf = selectedTourn?.tournamentFormat || '';
  const is6Team = tf === '6_TEAM';
  const is7Team = tf === '7_TEAM';
  const is8Team = tf === '8_TEAM' || (!is6Team && !is7Team);

  const PRESETS = is8Team
    ? [
        { label: '🏏 Group Stage M1 (Grp A)', stage: 'GROUP', slot: 'Group Stage M1', group: 'GROUP_A', num: '1' },
        { label: '🏏 Group Stage M7 (Grp B)', stage: 'GROUP', slot: 'Group Stage M7', group: 'GROUP_B', num: '7' },
        { label: '⚡ Playoff 1 (P1: Seed 1 vs 2)', stage: 'PLAYOFF', slot: 'Playoff 1 (P1)', group: '', num: '13' },
        { label: '🔥 Playoff 2 (P2: Seed 3 vs 4)', stage: 'PLAYOFF', slot: 'Playoff 2 (P2)', group: '', num: '14' },
        { label: '⚡ Playoff 3 (P3: Final Spot)', stage: 'PLAYOFF', slot: 'Playoff 3 (P3)', group: '', num: '15' },
        { label: '🏆 Grand Final (M16)', stage: 'FINAL', slot: 'Grand Final', group: '', num: '16' },
      ]
    : is7Team
    ? [
        { label: '🏏 Group Stage M1 (Grp A)', stage: 'GROUP', slot: 'Group Stage M1', group: 'GROUP_A', num: '1' },
        { label: '🏏 Group Stage M2 (Grp B)', stage: 'GROUP', slot: 'Group Stage M2', group: 'GROUP_B', num: '2' },
        { label: '⚡ Playoff 1 (P1: A1 vs B1)', stage: 'PLAYOFF', slot: 'Playoff 1 (P1)', group: '', num: '8' },
        { label: '🔥 Playoff 2 (P2: A2 vs B2)', stage: 'PLAYOFF', slot: 'Playoff 2 (P2)', group: '', num: '9' },
        { label: '⚡ Playoff 3 (P3: Final Spot)', stage: 'PLAYOFF', slot: 'Playoff 3 (P3)', group: '', num: '10' },
        { label: '🏆 Grand Final (M11)', stage: 'FINAL', slot: 'Grand Final', group: '', num: '11' },
      ]
    : [
        { label: '🏏 Group Stage M1 (Grp A)', stage: 'GROUP', slot: 'Group Stage M1', group: 'GROUP_A', num: '1' },
        { label: '🏏 Group Stage M2 (Grp B)', stage: 'GROUP', slot: 'Group Stage M2', group: 'GROUP_B', num: '2' },
        { label: '🌟 Wildcard 1 (WC1)', stage: 'WILDCARD', slot: 'Wildcard 1 (WC1)', group: '', num: '7' },
        { label: '🌟 Wildcard 2 (WC2)', stage: 'WILDCARD', slot: 'Wildcard 2 (WC2)', group: '', num: '8' },
        { label: '🌟 Wildcard 3 (WC3)', stage: 'WILDCARD', slot: 'Wildcard 3 (WC3)', group: '', num: '9' },
        { label: '⚡ Qualifier 1 (Q1)', stage: 'QUALIFIER', slot: 'Qualifier 1 (Q1)', group: '', num: '10' },
        { label: '🔥 Eliminator (ELIM)', stage: 'PLAYOFF', slot: 'Eliminator (ELIM)', group: '', num: '11' },
        { label: '⚡ Qualifier 2 (Q2)', stage: 'QUALIFIER', slot: 'Qualifier 2 (Q2)', group: '', num: '12' },
        { label: '🏆 Grand Final', stage: 'FINAL', slot: 'Grand Final', group: '', num: '13' },
      ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tournamentId) {
      setError('Please select a tournament.');
      return;
    }
    if (!teamAId || !teamBId) {
      setError('Please select both Team A and Team B.');
      return;
    }
    if (teamAId === teamBId) {
      setError('Team A and Team B cannot be the same team.');
      return;
    }
    if (oversPerInnings < 1) {
      setError('Overs per innings must be at least 1.');
      return;
    }
    if (ballsPerOver < 1) {
      setError('Balls per over must be at least 1.');
      return;
    }

    startTransition(async () => {
      try {
        const createRes = await createMatchAction({
          tournamentId,
          teamAId,
          teamBId,
          oversPerInnings: Number(oversPerInnings),
          ballsPerOver: Number(ballsPerOver),
          stage: stage.trim() || undefined,
          groupName: groupName.trim() || undefined,
          matchNumber: matchNumber ? Number(matchNumber) : undefined,
          bracketSlot: matchName.trim() || undefined,
        });

        if (!createRes.success || !createRes.matchId) {
          setError(createRes.error || 'Failed to create match.');
          return;
        }

        const matchId = createRes.matchId;

        // If user wants to start match immediately
        if (startImmediately) {
          const effectiveTossWinnerId = tossWinnerChoice === 'TEAM_B' ? teamBId : teamAId;
          const startRes = await startMatchAction(matchId, {
            tossWinnerId: effectiveTossWinnerId,
            tossDecision,
          });

          if (!startRes.success) {
            setError(startRes.error || 'Match created, but failed to start live match.');
            router.push(`/${entryPath}/matches/${matchId}/score`);
            return;
          }
        }

        router.push(`/${entryPath}/matches/${matchId}/score`);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Error Alert */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            color: '#FCA5A5',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </span>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FCA5A5',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '1rem',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: TOURNAMENT */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '8px',
            color: '#94A3B8',
          }}
        >
          Championship Tournament *
        </label>
        {tournaments.length === 0 ? (
          <div
            style={{
              padding: '14px',
              backgroundColor: '#141A26',
              border: '1px dashed #2A364E',
              borderRadius: '10px',
              color: '#F59E0B',
              fontSize: '0.88rem',
            }}
          >
            ⚠️ No tournaments found. Please create a tournament first before scheduling a match.
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <select
              value={tournamentId}
              onChange={(e) => {
                const nextId = e.target.value;
                setTournamentId(nextId);
                const selectedTourn = tournaments.find((t) => t.id === nextId);
                const stage = selectedTourn?.stages?.[0];
                if (stage?.oversPerInnings) setOversPerInnings(stage.oversPerInnings);
                if (stage?.ballsPerOver) setBallsPerOver(stage.ballsPerOver);
              }}
              required
              style={{
                width: '100%',
                background: '#141A26',
                border: '1px solid #2A364E',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id} style={{ background: '#10141E', color: '#FFF' }}>
                  🏆 {t.name} {t.season ? `(${t.season})` : ''}
                </option>
              ))}
            </select>
            <div
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#64748B',
                fontSize: '0.8rem',
              }}
            >
              ▼
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: TOURNAMENT STAGE & FIXTURE DESIGNATION */}
      <div
        style={{
          background: '#0D111A',
          border: '1px solid #1E2638',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#F59E0B',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontFamily: 'monospace',
              }}
            >
              STAGE & FIXTURE DESIGNATION
            </span>
            <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0' }}>
              Assign fixture name (e.g. Grand Final, Wildcard 1, Group Stage M1), tournament stage, and bracket slot.
            </p>
          </div>

          {/* Live Preview Chip */}
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              backgroundColor:
                stage === 'FINAL'
                  ? 'rgba(239, 68, 68, 0.18)'
                  : stage === 'QUALIFIER' || stage === 'PLAYOFF'
                  ? 'rgba(139, 92, 246, 0.18)'
                  : stage === 'WILDCARD'
                  ? 'rgba(245, 158, 11, 0.18)'
                  : 'rgba(16, 185, 129, 0.18)',
              border: `1px solid ${
                stage === 'FINAL'
                  ? 'rgba(239, 68, 68, 0.5)'
                  : stage === 'QUALIFIER' || stage === 'PLAYOFF'
                  ? 'rgba(139, 92, 246, 0.5)'
                  : stage === 'WILDCARD'
                  ? 'rgba(245, 158, 11, 0.5)'
                  : 'rgba(16, 185, 129, 0.5)'
              }`,
              color:
                stage === 'FINAL'
                  ? '#FCA5A5'
                  : stage === 'QUALIFIER' || stage === 'PLAYOFF'
                  ? '#C4B5FD'
                  : stage === 'WILDCARD'
                  ? '#FDE68A'
                  : '#6EE7B7',
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>
              {stage === 'FINAL'
                ? '🏆'
                : stage === 'QUALIFIER' || stage === 'PLAYOFF'
                ? '⚡'
                : stage === 'WILDCARD'
                ? '🌟'
                : '🏏'}
            </span>
            <span>
              {matchName || stage || 'UNASSIGNED'}
              {matchNumber ? ` · #${matchNumber}` : ''}
              {groupName ? ` (${groupName === 'GROUP_A' ? 'Grp A' : 'Grp B'})` : ''}
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#94A3B8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px',
            }}
          >
            ⚡ Quick Presets (Click to autofill)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PRESETS.map((p) => {
              const isActive =
                matchName === p.slot && stage === p.stage && (p.group ? groupName === p.group : true);
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setStage(p.stage);
                    setMatchName(p.slot);
                    setGroupName(p.group);
                    if (p.num) setMatchNumber(p.num);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'rgba(245, 158, 11, 0.2)' : '#141A26',
                    border: isActive ? '1px solid #F59E0B' : '1px solid #2A364E',
                    color: isActive ? '#FBBF24' : '#CBD5E1',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Row: Match Name & Stage Dropdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {/* Match Name / Slot Title */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '6px',
                color: '#CBD5E1',
              }}
            >
              Match Name / Title *
            </label>
            <input
              type="text"
              value={matchName}
              onChange={(e) => setMatchName(e.target.value)}
              placeholder="e.g. Grand Final, Wildcard 1, Group Stage M1"
              required
              style={{
                width: '100%',
                background: '#141A26',
                border: '1px solid #2A364E',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Stage Dropdown */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '6px',
                color: '#CBD5E1',
              }}
            >
              Tournament Stage
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                style={{
                  width: '100%',
                  background: '#141A26',
                  border: '1px solid #2A364E',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="GROUP" style={{ background: '#10141E', color: '#FFF' }}>🏏 GROUP (Group Stage)</option>
                {is6Team && (
                  <option value="WILDCARD" style={{ background: '#10141E', color: '#FFF' }}>🌟 WILDCARD (Wildcard Match)</option>
                )}
                <option value="PLAYOFF" style={{ background: '#10141E', color: '#FFF' }}>⚡ PLAYOFF (Playoffs / Semis)</option>
                <option value="FINAL" style={{ background: '#10141E', color: '#FFF' }}>🏆 FINAL (Grand Final)</option>
                <option value="OTHER" style={{ background: '#10141E', color: '#FFF' }}>OTHER (Custom Fixture)</option>
              </select>
              <div
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                  fontSize: '0.75rem',
                }}
              >
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Row: Group & Match Number */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {/* Tournament Group */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '6px',
                color: '#CBD5E1',
              }}
            >
              Tournament Group
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{
                  width: '100%',
                  background: '#141A26',
                  border: '1px solid #2A364E',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="" style={{ background: '#10141E', color: '#FFF' }}>None / Knockout</option>
                <option value="GROUP_A" style={{ background: '#10141E', color: '#FFF' }}>Group A</option>
                <option value="GROUP_B" style={{ background: '#10141E', color: '#FFF' }}>Group B</option>
              </select>
              <div
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                  fontSize: '0.75rem',
                }}
              >
                ▼
              </div>
            </div>
          </div>

          {/* Match Number */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '6px',
                color: '#CBD5E1',
              }}
            >
              Match Number (#)
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={matchNumber}
              onChange={(e) => setMatchNumber(e.target.value)}
              placeholder="e.g. 1"
              style={{
                width: '100%',
                background: '#141A26',
                border: '1px solid #2A364E',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: CONTENDING TEAMS & MATCHUP PREVIEW */}
      <div
        style={{
          background: '#0D111A',
          border: '1px solid #1E2638',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#F59E0B',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: 'monospace',
            }}
          >
            CONTENDING TEAMS
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Select both opponents</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Team A */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '6px',
                color: '#CBD5E1',
              }}
            >
              Team A (Home / 1st Named) *
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={teamAId}
                onChange={(e) => setTeamAId(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: '#141A26',
                  border: '1px solid #2A364E',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="" style={{ background: '#10141E', color: '#888' }}>
                  Select Team A...
                </option>
                {teams.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={t.id === teamBId}
                    style={{ background: '#10141E', color: '#FFF' }}
                  >
                    {t.name} {t.shortName ? `(${t.shortName})` : ''}
                  </option>
                ))}
              </select>
              <div
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                  fontSize: '0.75rem',
                }}
              >
                ▼
              </div>
            </div>
          </div>

          {/* Team B */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '6px',
                color: '#CBD5E1',
              }}
            >
              Team B (Away / 2nd Named) *
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={teamBId}
                onChange={(e) => setTeamBId(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: '#141A26',
                  border: '1px solid #2A364E',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="" style={{ background: '#10141E', color: '#888' }}>
                  Select Team B...
                </option>
                {teams.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={t.id === teamAId}
                    style={{ background: '#10141E', color: '#FFF' }}
                  >
                    {t.name} {t.shortName ? `(${t.shortName})` : ''}
                  </option>
                ))}
              </select>
              <div
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                  fontSize: '0.75rem',
                }}
              >
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Live Matchup VS Card */}
        {selectedTeamA && selectedTeamB && (
          <div
            style={{
              marginTop: '4px',
              padding: '14px 18px',
              background: 'linear-gradient(135deg, rgba(20, 26, 38, 0.9) 0%, rgba(13, 17, 26, 0.9) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#C0272D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: '#FFF',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(192, 39, 45, 0.4)',
                }}
              >
                {selectedTeamA.shortName?.slice(0, 3) || selectedTeamA.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFF', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {selectedTeamA.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                  {selectedTeamA.shortName || 'Team A'}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#FBBF24',
                fontWeight: 900,
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                letterSpacing: '0.08em',
                flexShrink: 0,
              }}
            >
              VS
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'flex-end', textAlign: 'right' }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFF', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {selectedTeamB.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                  {selectedTeamB.shortName || 'Team B'}
                </div>
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: '#FFF',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                }}
              >
                {selectedTeamB.shortName?.slice(0, 3) || selectedTeamB.name.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: OVERS & DELIVERY RULES */}
      <div
        style={{
          background: '#0D111A',
          border: '1px solid #1E2638',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#F59E0B',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: 'monospace',
            }}
          >
            OVERS & DELIVERY RULES
          </span>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0' }}>
            Specify the exact overs per innings and balls per over for this match.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '6px',
                color: '#CBD5E1',
              }}
            >
              Overs Per Innings *
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={oversPerInnings}
              onChange={(e) => setOversPerInnings(Number(e.target.value))}
              required
              style={{
                width: '100%',
                background: '#141A26',
                border: '1px solid #2A364E',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '6px',
                color: '#CBD5E1',
              }}
            >
              Balls Per Over *
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={ballsPerOver}
              onChange={(e) => setBallsPerOver(Number(e.target.value))}
              required
              style={{
                width: '100%',
                background: '#141A26',
                border: '1px solid #2A364E',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: INSTANT LIVE LAUNCH & TOSS */}
      <div
        style={{
          background: startImmediately
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(20, 26, 38, 0.8) 100%)'
            : '#0D111A',
          border: startImmediately ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #1E2638',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          transition: 'all 0.2s ease',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={startImmediately}
            onChange={(e) => setStartImmediately(e.target.checked)}
            style={{
              width: '20px',
              height: '20px',
              accentColor: '#EF4444',
              cursor: 'pointer',
              marginTop: '2px',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
                Start match immediately
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: startImmediately ? '#EF4444' : '#1E2638',
                  color: '#FFF',
                  fontFamily: 'monospace',
                }}
              >
                {startImmediately ? '⚡ LIVE LAUNCH' : 'UPCOMING'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#8B9BB4', margin: '4px 0 0' }}>
              Sets the toss outcome immediately and opens the live ball-by-ball scoring console.
            </p>
          </div>
        </label>

        {startImmediately && (
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Toss Winner Selector (Always Interactive) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '8px',
                  color: '#CBD5E1',
                }}
              >
                🪙 Toss Winner
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setTossWinnerChoice('TEAM_A')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: tossWinnerChoice === 'TEAM_A' ? '2px solid #F59E0B' : '1px solid #2A364E',
                    backgroundColor: tossWinnerChoice === 'TEAM_A' ? 'rgba(245, 158, 11, 0.15)' : '#141A26',
                    color: tossWinnerChoice === 'TEAM_A' ? '#FBBF24' : '#94A3B8',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{tossWinnerChoice === 'TEAM_A' ? '🏆' : '⚪'}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedTeamA ? selectedTeamA.name : 'Team A (Select above)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTossWinnerChoice('TEAM_B')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: tossWinnerChoice === 'TEAM_B' ? '2px solid #F59E0B' : '1px solid #2A364E',
                    backgroundColor: tossWinnerChoice === 'TEAM_B' ? 'rgba(245, 158, 11, 0.15)' : '#141A26',
                    color: tossWinnerChoice === 'TEAM_B' ? '#FBBF24' : '#94A3B8',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{tossWinnerChoice === 'TEAM_B' ? '🏆' : '⚪'}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedTeamB ? selectedTeamB.name : 'Team B (Select above)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Toss Decision Selector */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '8px',
                  color: '#CBD5E1',
                }}
              >
                🏏 Toss Decision (Elected To)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setTossDecision('BAT')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: tossDecision === 'BAT' ? '2px solid #10B981' : '1px solid #2A364E',
                    backgroundColor: tossDecision === 'BAT' ? 'rgba(16, 185, 129, 0.15)' : '#141A26',
                    color: tossDecision === 'BAT' ? '#34D399' : '#94A3B8',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>🏏</span>
                  <span>Bat First</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTossDecision('BOWL')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: tossDecision === 'BOWL' ? '2px solid #3B82F6' : '1px solid #2A364E',
                    backgroundColor: tossDecision === 'BOWL' ? 'rgba(59, 130, 246, 0.15)' : '#141A26',
                    color: tossDecision === 'BOWL' ? '#60A5FA' : '#94A3B8',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>⚾</span>
                  <span>Bowl First</span>
                </button>
              </div>
            </div>

            {/* Toss Summary Callout */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: '#CBD5E1',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🎯</span>
              <span>
                <strong>{winningTeamDisplayName}</strong> won the toss and elected to{' '}
                <strong style={{ color: '#F59E0B' }}>
                  {tossDecision === 'BAT' ? 'Bat First' : 'Bowl First'}
                </strong>
                .
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SUBMIT BUTTON */}
      <button
        type="submit"
        disabled={isPending}
        style={{
          background: startImmediately
            ? 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)'
            : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          color: '#FFFFFF',
          padding: '16px 24px',
          borderRadius: '12px',
          border: 'none',
          fontWeight: 800,
          fontSize: '1rem',
          cursor: isPending ? 'not-allowed' : 'pointer',
          marginTop: '6px',
          boxShadow: startImmediately
            ? '0 6px 20px rgba(239, 68, 68, 0.4)'
            : '0 6px 20px rgba(37, 99, 235, 0.4)',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          letterSpacing: '0.02em',
        }}
      >
        {isPending ? (
          <>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
            <span>Initializing Match Engine...</span>
          </>
        ) : startImmediately ? (
          <>
            <span>⚡</span>
            <span>Start Match & Launch Scoring Console →</span>
          </>
        ) : (
          <>
            <span>📅</span>
            <span>Schedule Fixture (Upcoming) →</span>
          </>
        )}
      </button>
    </form>
  );
}
