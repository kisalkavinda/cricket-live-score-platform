import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from 'database';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import {
  updatePlayerServerAction,
  deletePlayerServerAction,
} from '@/lib/admin/admin-actions';

export const dynamic = 'force-dynamic';

export default async function AdminPlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string; secretPath: string }>;
}) {
  await requireAdminAuth();
  const { id } = await params;
  const entryPath = getAdminEntryPath();

  const player = await (prisma as any).player.findUnique({
    where: { id },
    include: {
      teamPlayers: {
        include: {
          team: true,
        },
      },
    },
  });

  if (!player) {
    notFound();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Breadcrumb Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid #1E2638',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#C0272D',
              textTransform: 'uppercase',
              marginBottom: '4px',
              fontFamily: 'monospace',
            }}
          >
            PLAYER PROFILE • TOURNAMENT ROSTER
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {player.name}
          </h1>
        </div>

        <Link
          href={`/${entryPath}/players`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: '#161D2B',
            color: '#8B9BB4',
            fontSize: '12px',
            fontWeight: 700,
            textDecoration: 'none',
            border: '1px solid #222C3E',
            transition: 'all 0.15s ease',
          }}
        >
          ← Back to Players Directory
        </Link>
      </div>

      {/* Main Content Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Player Identity Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              backgroundColor: '#10141E',
              border: '1px solid #1E2638',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              {player.profileImageUrl ? (
                <img
                  src={player.profileImageUrl}
                  alt={player.name}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: '#1E2638',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    backgroundColor: '#1E2638',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 800,
                    color: '#FBBF24',
                    border: '2px solid rgba(245, 158, 11, 0.3)',
                    flexShrink: 0,
                  }}
                >
                  {player.name?.charAt(0) || 'P'}
                </div>
              )}

              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  {player.name}
                </h2>
                {player.indexNumber ? (
                  <div
                    style={{
                      display: 'inline-block',
                      marginTop: '6px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#FBBF24',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Index: {player.indexNumber}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    No Index Number registered
                  </div>
                )}
              </div>
            </div>

            {/* Team Affiliations */}
            <div style={{ borderTop: '1px solid #1E2638', paddingTop: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8B9BB4', marginBottom: '10px' }}>
                Assigned Team Franchise
              </div>
              {player.teamPlayers?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {player.teamPlayers.map((tp: any) => (
                    <Link
                      key={tp.id}
                      href={`/${entryPath}/teams/${tp.team.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: '#141A26',
                        border: '1px solid #1E2638',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {tp.team.logoUrl ? (
                          <img
                            src={tp.team.logoUrl}
                            alt={tp.team.name}
                            style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: '16px' }}>🛡️</span>
                        )}
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>{tp.team.name}</span>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#FBBF24', padding: '1px 6px', backgroundColor: '#1E2638', borderRadius: '4px' }}>
                          {tp.team.shortName}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#8B9BB4' }}>→</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#64748B', fontStyle: 'italic' }}>
                  Unassigned / Free Agent
                </div>
              )}
            </div>
          </div>

          {/* Delete Danger Zone */}
          <div
            style={{
              backgroundColor: '#10141E',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444', margin: '0 0 6px' }}>
              Delete Player Record
            </h4>
            <p style={{ fontSize: '12px', color: '#8B9BB4', margin: '0 0 14px', lineHeight: 1.4 }}>
              Permanently remove this player from the tournament database and all team rosters.
            </p>
            <form
              action={async () => {
                'use server';
                await deletePlayerServerAction(player.id);
              }}
            >
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Delete Player
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Edit Player Details Form */}
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
            ⚙️ Edit Player Profile
          </h3>
          <p style={{ fontSize: '12px', color: '#8B9BB4', margin: '0 0 20px', lineHeight: 1.4 }}>
            Update player full name, university index number, or profile photo URL.
          </p>

          <form
            action={async (formData) => {
              'use server';
              await updatePlayerServerAction(player.id, formData);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8B9BB4', marginBottom: '4px' }}>
                Player Full Name *
              </label>
              <input
                type="text"
                name="name"
                defaultValue={player.name}
                required
                style={{
                  width: '100%',
                  height: '40px',
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
                University Index Number
              </label>
              <input
                type="text"
                name="indexNumber"
                defaultValue={player.indexNumber || ''}
                placeholder="e.g. IT22001920"
                style={{
                  width: '100%',
                  height: '40px',
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
                Profile Picture URL
              </label>
              <input
                type="url"
                name="profileImageUrl"
                defaultValue={player.profileImageUrl || ''}
                placeholder="https://..."
                style={{
                  width: '100%',
                  height: '40px',
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
                marginTop: '8px',
                height: '40px',
                borderRadius: '6px',
                backgroundColor: '#C0272D',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                border: '1px solid #D32F35',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(192, 39, 45, 0.3)',
              }}
            >
              Save Player Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
