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

  const team = await (prisma as any).team.findUnique({
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
  });

  if (!team) {
    notFound();
  }

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
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
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

        {/* Collapsible Edit Team & Logo Form */}
        <details
          style={{
            backgroundColor: '#141A26',
            border: '1px solid #1E2638',
            borderRadius: '8px',
            padding: '12px 16px',
          }}
        >
          <summary
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#FBBF24',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            ⚙️ Edit Team Details & Logo URL
          </summary>

          <form
            action={async (formData) => {
              'use server';
              await updateTeamServerAction(team.id, formData);
            }}
            style={{
              marginTop: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              alignItems: 'end',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                Team Name
              </label>
              <input
                type="text"
                name="name"
                defaultValue={team.name}
                required
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
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
                Short Name / Code
              </label>
              <input
                type="text"
                name="shortName"
                defaultValue={team.shortName}
                required
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
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
                City / Faculty
              </label>
              <input
                type="text"
                name="city"
                defaultValue={team.city || ''}
                placeholder="e.g. Computing"
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
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
                Team Logo Image URL
              </label>
              <input
                type="url"
                name="logoUrl"
                defaultValue={team.logoUrl || ''}
                placeholder="https://..."
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
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
              <button
                type="submit"
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '6px',
                  backgroundColor: '#C0272D',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: '1px solid #D32F35',
                  cursor: 'pointer',
                }}
              >
                Save Team Details
              </button>
            </div>
          </form>
        </details>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {tp.player.profileImageUrl ? (
                            <img
                              src={tp.player.profileImageUrl}
                              alt={tp.player.name}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                backgroundColor: '#1E2638',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: '#1E2638',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#CBD5E1',
                                flexShrink: 0,
                              }}
                            >
                              {tp.player.name?.charAt(0) || 'P'}
                            </div>
                          )}
                          <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{tp.player.name}</div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: tp.player.indexNumber ? '#FBBF24' : '#64748B' }}>
                        {tp.player.indexNumber || 'N/A'}
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

        {/* Right Column: Add Players Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Add Player Directly to Squad */}
          <div
            style={{
              backgroundColor: '#10141E',
              border: '1px solid #1E2638',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px', color: '#FFFFFF' }}>
              ➕ Add Player to Squad
            </h3>
            <p style={{ fontSize: '12px', color: '#8B9BB4', margin: '0 0 16px', lineHeight: 1.4 }}>
              Register and add a new player directly to this team roster.
            </p>

            <form
              action={async (formData) => {
                'use server';
                await createAndAssignPlayerServerAction(team.id, formData);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                  Player Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Kasun Fernando"
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

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                  Profile Picture URL (Optional)
                </label>
                <input
                  type="url"
                  name="profileImageUrl"
                  placeholder="https://..."
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
