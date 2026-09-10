import { prisma } from 'database';
import Link from 'next/link';
import { getAdminEntryPath, requireAdminAuth } from '@/lib/auth/admin-auth';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';
import { normalizeImageUrl } from '@/lib/utils/image-utils';

export const dynamic = 'force-dynamic';

const getTeams = async () =>
  (prisma as any).team.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      shortName: true,
      logoUrl: true,
      city: true,
      _count: {
        select: {
          teamPlayers: true,
        },
      },
    },
  });

export default async function AdminTeamsPage() {
  const tracker = createPerfTracker();
  tracker.authStart = performance.now();
  await requireAdminAuth();
  tracker.authEnd = performance.now();

  const entryPath = getAdminEntryPath();

  tracker.dbStart = performance.now();
  const teams = await getTeams();
  tracker.dbEnd = performance.now();

  tracker.renderStart = performance.now();
  tracker.renderEnd = performance.now();
  logPerfMetric('/teams', tracker);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Header Row */}
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
            DIRECTORY • {teams.length} OFFICIAL FRANCHISES
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
            Official Teams
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: '#8B9BB4',
              margin: '4px 0 0',
            }}
          >
            Manage participating tournament franchises, official team rosters, and squad allocations.
          </p>
        </div>

        <Link
          href={`/${entryPath}/teams/new`}
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
            transition: 'all 0.15s ease',
          }}
        >
          <span>+</span>
          <span>Add New Team</span>
        </Link>
      </div>

      {/* Grid of Teams */}
      {teams.length === 0 ? (
        <div
          style={{
            backgroundColor: '#10141E',
            border: '1px dashed #1E2638',
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛡️</div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px' }}>
            No official teams yet
          </h3>
          <p style={{ fontSize: '13px', color: '#8B9BB4', margin: '0 0 20px' }}>
            Teams will appear here once approved from registrations or created manually.
          </p>
          <Link
            href={`/${entryPath}/teams/new`}
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: '#C0272D',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Create Team Franchise
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {teams.map((team: any) => {
            const playerCount = team._count?.teamPlayers ?? 0;

            return (
              <div
                key={team.id}
                style={{
                  backgroundColor: '#10141E',
                  border: '1px solid #1E2638',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  {/* Team Logo or Crest Avatar */}
                  {normalizeImageUrl(team.logoUrl) ? (
                    <img
                      src={normalizeImageUrl(team.logoUrl)!}
                      alt={team.name}
                      referrerPolicy="no-referrer"
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        backgroundColor: '#0A0D14',
                        border: '1px solid #1E2638',
                        padding: '2px',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(192, 39, 45, 0.15) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FBBF24',
                        fontWeight: 800,
                        fontSize: '15px',
                        fontFamily: 'monospace',
                        letterSpacing: '0.04em',
                        flexShrink: 0,
                      }}
                    >
                      {team.shortName || team.name?.substring(0, 3)?.toUpperCase()}
                    </div>
                  )}

                  {/* Team Details */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        margin: 0,
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {team.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span
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
                        {team.shortName || 'N/A'}
                      </span>
                      {team.city && (
                        <span style={{ fontSize: '12px', color: '#8B9BB4' }}>
                          🎓 Intake: {team.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Strip */}
                <div
                  style={{
                    paddingTop: '14px',
                    borderTop: '1px solid #1E2638',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#8B9BB4' }}>
                    <strong style={{ color: '#FFFFFF', fontFamily: 'monospace', fontSize: '13px' }}>
                      {playerCount}
                    </strong>{' '}
                    Players in Squad
                  </div>

                  <Link
                    href={`/${entryPath}/teams/${team.id}`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#1E2638',
                      color: '#E2E8F0',
                      fontSize: '11px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      border: '1px solid #2A364E',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Manage Roster →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
