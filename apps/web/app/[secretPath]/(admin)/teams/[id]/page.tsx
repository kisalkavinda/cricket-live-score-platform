import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from 'database';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import {
  addPlayerToTeamServerAction,
  removePlayerFromTeamServerAction,
  createAndAssignPlayerServerAction,
} from '@/lib/admin/admin-actions';

export const dynamic = 'force-dynamic';

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string; secretPath: string }>;
}) {
  await requireAdminAuth();
  const { id } = await params;
  const entryPath = getAdminEntryPath();

  const [team, allPlayers] = await Promise.all([
    (prisma as any).team.findUnique({
      where: { id },
      include: {
        teamPlayers: {
          include: {
            player: true,
          },
          orderBy: { joinedAt: 'asc' },
        },
        tournamentTeams: {
          include: {
            tournament: true,
          },
        },
      },
    }),
    (prisma as any).player.findMany({
      orderBy: { name: 'asc' },
      take: 100,
    }),
  ]);

  if (!team) {
    notFound();
  }

  const assignedPlayerIds = new Set(team.teamPlayers.map((tp: any) => tp.playerId));
  const availablePlayers = allPlayers.filter((p: any) => !assignedPlayerIds.has(p.id));

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'BATTER':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#93C5FD', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
            🏏 BATTER
          </span>
        );
      case 'BOWLER':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#FCD34D', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
            🎯 BOWLER
          </span>
        );
      case 'ALL_ROUNDER':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#6EE7B7', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            ⚡ ALL-ROUNDER
          </span>
        );
      case 'WICKET_KEEPER':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#D8B4FE', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
            🧤 WICKET-KEEPER
          </span>
        );
      default:
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', backgroundColor: '#1E2638', color: '#94A3B8' }}>
            {role}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Back Navigation & Breadcrumb */}
      <div>
        <Link
          href={`/${entryPath}/teams`}
          style={{
            color: '#8B9BB4',
            fontSize: '13px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '12px',
            fontWeight: 600,
          }}
        >
          ← Back to Official Teams
        </Link>
      </div>

      {/* Team Header Card */}
      <div
        style={{
          backgroundColor: '#10141E',
          border: '1px solid #1E2638',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={team.name}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '14px',
                objectFit: 'cover',
                backgroundColor: '#0A0D14',
                border: '1px solid #1E2638',
                padding: '2px',
              }}
            />
          ) : (
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(192, 39, 45, 0.2) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FBBF24',
                fontWeight: 800,
                fontSize: '20px',
                fontFamily: 'monospace',
                letterSpacing: '0.04em',
              }}
            >
              {team.shortName || team.name?.substring(0, 3)?.toUpperCase()}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                {team.name}
              </h1>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  backgroundColor: '#1E2638',
                  color: '#FBBF24',
                }}
              >
                {team.shortName}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '13px', color: '#8B9BB4' }}>
              {team.city && <span>📍 {team.city}</span>}
              <span>🛡️ Franchise ID: <code style={{ fontFamily: 'monospace', color: '#CBD5E1' }}>{team.id.substring(0, 8)}...</code></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px', fontFamily: 'monospace' }}>
          <div style={{ backgroundColor: '#141A26', border: '1px solid #1E2638', borderRadius: '8px', padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#8B9BB4', textTransform: 'uppercase' }}>Roster Size</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
              {team.teamPlayers.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Roster List (2 cols) & Add Player Forms (1 col) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Squad Members Roster Table */}
        <div
          style={{
            backgroundColor: '#10141E',
            border: '1px solid #1E2638',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            gridColumn: 'span 2 / span 2',
          }}
        >
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid #1E2638',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Squad Roster ({team.teamPlayers.length})
              </h3>
              <p style={{ fontSize: '12px', color: '#8B9BB4', margin: '2px 0 0' }}>
                Official active players registered to this franchise squad.
              </p>
            </div>
          </div>

          {team.teamPlayers.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#8B9BB4', fontSize: '13px' }}>
              No players assigned to this roster yet. Use the form on the right to add members.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#141A26', borderBottom: '1px solid #1E2638' }}>
                    <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', width: '50px' }}>#</th>
                    <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Player Name</th>
                    <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Index Number</th>
                    <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Style</th>
                    <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {team.teamPlayers.map((tp: any, idx: number) => (
                    <tr key={tp.id} style={{ borderBottom: '1px solid #161D2B' }}>
                      <td style={{ padding: '14px 18px', color: '#64748B', fontFamily: 'monospace' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{tp.player.name}</div>
                      </td>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: tp.player.indexNumber ? '#FBBF24' : '#64748B' }}>
                        {tp.player.indexNumber || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#8B9BB4', fontSize: '12px' }}>
                        {tp.player.battingStyle && <div>🏏 {tp.player.battingStyle}</div>}
                        {tp.player.bowlingStyle && <div style={{ marginTop: '2px' }}>🎯 {tp.player.bowlingStyle}</div>}
                        {!tp.player.battingStyle && !tp.player.bowlingStyle && <span style={{ color: '#475569' }}>-</span>}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <form
                          action={async () => {
                            'use server';
                            await removePlayerFromTeamServerAction(tp.id, team.id);
                          }}
                        >
                          <button
                            type="submit"
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#EF4444',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Player Sidebar Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Assign Existing Player */}
          {availablePlayers.length > 0 && (
            <div
              style={{
                backgroundColor: '#10141E',
                border: '1px solid #1E2638',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>
                Add Existing Player
              </h3>
              <form
                action={async (formData: FormData) => {
                  'use server';
                  const playerId = formData.get('playerId') as string;
                  if (playerId) {
                    await addPlayerToTeamServerAction(team.id, playerId);
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <select
                  name="playerId"
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    backgroundColor: '#1A1F2C',
                    border: '1px solid #2A364E',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select unassigned player...</option>
                  {availablePlayers.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role}) {p.indexNumber ? `- ${p.indexNumber}` : ''}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  style={{
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: '#1E2638',
                    border: '1px solid #2A364E',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Add to Squad
                </button>
              </form>
            </div>
          )}

          {/* Register New Player Direct to Team */}
          <div
            style={{
              backgroundColor: '#10141E',
              border: '1px solid #1E2638',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>
              Register New Player
            </h3>

            <form
              action={async (formData: FormData) => {
                'use server';
                await createAndAssignPlayerServerAction(team.id, formData);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Kasun Perera"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    backgroundColor: '#1A1F2C',
                    border: '1px solid #2A364E',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                  Role *
                </label>
                <select
                  name="role"
                  required
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    backgroundColor: '#1A1F2C',
                    border: '1px solid #2A364E',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="BATTER">Batter</option>
                  <option value="BOWLER">Bowler</option>
                  <option value="ALL_ROUNDER">All-Rounder</option>
                  <option value="WICKET_KEEPER">Wicket-Keeper</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                  Index Number
                </label>
                <input
                  type="text"
                  name="indexNumber"
                  placeholder="e.g. IT22001920"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    backgroundColor: '#1A1F2C',
                    border: '1px solid #2A364E',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                    Batting Style
                  </label>
                  <input
                    type="text"
                    name="battingStyle"
                    placeholder="Right Hand"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      backgroundColor: '#1A1F2C',
                      border: '1px solid #2A364E',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                    Bowling Style
                  </label>
                  <input
                    type="text"
                    name="bowlingStyle"
                    placeholder="Right Fast"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      backgroundColor: '#1A1F2C',
                      border: '1px solid #2A364E',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '4px',
                  height: '38px',
                  borderRadius: '6px',
                  backgroundColor: '#C0272D',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: '1px solid #D32F35',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(192, 39, 45, 0.3)',
                }}
              >
                + Register & Add to Squad
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
