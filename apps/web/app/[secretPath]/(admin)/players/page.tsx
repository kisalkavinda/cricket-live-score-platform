import { prisma } from 'database';
import Link from 'next/link';
import { getAdminEntryPath, requireAdminAuth } from '@/lib/auth/admin-auth';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';
import DeletePlayerButton from '@/components/admin/DeletePlayerButton';
import { normalizeImageUrl } from '@/lib/utils/image-utils';

export const dynamic = 'force-dynamic';

const getPlayers = async () =>
  (prisma as any).player.findMany({
    orderBy: { name: 'asc' },
    take: 200,
    select: {
      id: true,
      name: true,
      indexNumber: true,
      profileImageUrl: true,
      teamPlayers: {
        select: {
          id: true,
          team: {
            select: {
              id: true,
              name: true,
              shortName: true,
              logoUrl: true,
            },
          },
        },
      },
    },
  });

export default async function AdminPlayersPage() {
  const tracker = createPerfTracker();
  tracker.authStart = performance.now();
  await requireAdminAuth();
  tracker.authEnd = performance.now();

  const entryPath = getAdminEntryPath();

  tracker.dbStart = performance.now();
  const players = await getPlayers();
  tracker.dbEnd = performance.now();

  tracker.renderStart = performance.now();
  tracker.renderEnd = performance.now();
  logPerfMetric('/players', tracker);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
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
            ROSTER • {players.length} ACTIVE PROFILES
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
            Official Players
          </h1>
          <p style={{ fontSize: '13px', color: '#8B9BB4', margin: '4px 0 0' }}>
            Comprehensive player registry and franchise squad allocations.
          </p>
        </div>

        <Link
          href={`/${entryPath}/players/new`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: '#C0272D',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            border: '1px solid #D32F35',
            boxShadow: '0 2px 10px rgba(192, 39, 45, 0.3)',
          }}
        >
          <span>+</span>
          <span>Add New Player</span>
        </Link>
      </div>

      {/* Players Data Table */}
      <div
        style={{
          backgroundColor: '#10141E',
          border: '1px solid #1E2638',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#141A26', borderBottom: '1px solid #1E2638' }}>
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Player</th>
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Index Number</th>
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Team</th>
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '48px 24px', textAlign: 'center', color: '#8B9BB4' }}>
                    No official players registered yet.
                  </td>
                </tr>
              ) : (
                players.map((player: any) => (
                  <tr key={player.id} style={{ borderBottom: '1px solid #161D2B' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {normalizeImageUrl(player.profileImageUrl) ? (
                          <img
                            src={normalizeImageUrl(player.profileImageUrl)!}
                            alt={player.name}
                            referrerPolicy="no-referrer"
                            style={{
                              width: '36px',
                              height: '36px',
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
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: '#1E2638',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#CBD5E1',
                              flexShrink: 0,
                            }}
                          >
                            {player.name?.charAt(0) || 'P'}
                          </div>
                        )}
                        <Link
                          href={`/${entryPath}/players/${player.id}`}
                          style={{ fontWeight: 700, color: '#FFFFFF', textDecoration: 'none' }}
                        >
                          {player.name}
                        </Link>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: player.indexNumber ? '#FBBF24' : '#64748B' }}>
                      {player.indexNumber || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {player.teamPlayers?.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {player.teamPlayers.map((tp: any) => (
                            <Link
                              key={tp.id}
                              href={`/${entryPath}/teams/${tp.team?.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                backgroundColor: '#1E2638',
                                color: '#FBBF24',
                                textDecoration: 'none',
                                border: '1px solid #2A364E',
                              }}
                            >
                              {normalizeImageUrl(tp.team?.logoUrl) ? (
                                <img src={normalizeImageUrl(tp.team.logoUrl)!} alt="" referrerPolicy="no-referrer" style={{ width: '14px', height: '14px', borderRadius: '2px', objectFit: 'cover' }} />
                              ) : (
                                <span>🛡️</span>
                              )}
                              <span>{tp.team?.shortName || tp.team?.name}</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Link
                          href={`/${entryPath}/players/${player.id}`}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#1E2638',
                            color: '#E2E8F0',
                            fontSize: '11px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            border: '1px solid #2A364E',
                          }}
                        >
                          Edit →
                        </Link>
                        <DeletePlayerButton isIconOnly playerId={player.id} playerName={player.name} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
