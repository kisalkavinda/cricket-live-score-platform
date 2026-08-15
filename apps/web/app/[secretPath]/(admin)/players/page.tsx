import { prisma } from 'database';
import Link from 'next/link';
import { getAdminEntryPath, requireAdminAuth } from '@/lib/auth/admin-auth';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';

export const dynamic = 'force-dynamic';

const getPlayers = async () =>
  (prisma as any).player.findMany({
    orderBy: { name: 'asc' },
    take: 100,
    select: {
      id: true,
      name: true,
      role: true,
      battingStyle: true,
      bowlingStyle: true,
      profileImageUrl: true,
      teamPlayers: {
        select: {
          id: true,
          team: {
            select: {
              id: true,
              name: true,
              shortName: true,
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
            Comprehensive player registry with batting/bowling disciplines and franchise squad allocations.
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
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Style</th>
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Team</th>
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
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
                        {player.profileImageUrl ? (
                          <img
                            src={player.profileImageUrl}
                            alt={player.name}
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
                        <div>
                          <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{player.name}</div>
                          {player.indexNumber && (
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#FBBF24' }}>
                              {player.indexNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {player.teamPlayers?.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {player.teamPlayers.map((tp: any) => (
                            <span
                              key={tp.id}
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                backgroundColor: '#1E2638',
                                color: '#FBBF24',
                              }}
                            >
                              {tp.team?.shortName || tp.team?.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
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
