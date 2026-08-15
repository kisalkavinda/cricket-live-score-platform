import { prisma } from 'database';
import Link from 'next/link';
import { getAdminEntryPath, requireAdminAuth } from '@/lib/auth/admin-auth';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';

export const dynamic = 'force-dynamic';

const getTournaments = async () =>
  (prisma as any).tournament.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      season: true,
      format: true,
      status: true,
      stages: { select: { id: true } },
      _count: {
        select: {
          matches: true,
          tournamentSquads: true,
        },
      },
    },
  });

export default async function AdminTournamentsPage() {
  const tracker = createPerfTracker();
  tracker.authStart = performance.now();
  await requireAdminAuth();
  tracker.authEnd = performance.now();

  const entryPath = getAdminEntryPath();

  tracker.dbStart = performance.now();
  const tournaments = await getTournaments();
  tracker.dbEnd = performance.now();

  tracker.renderStart = performance.now();
  tracker.renderEnd = performance.now();
  logPerfMetric('/tournaments', tracker);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, fontFamily: 'monospace', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            ● LIVE IN PROGRESS
          </span>
        );
      case 'REGISTRATION':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, fontFamily: 'monospace', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            REGISTRATION OPEN
          </span>
        );
      case 'SCHEDULED':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, fontFamily: 'monospace', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            SCHEDULED
          </span>
        );
      case 'COMPLETED':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, fontFamily: 'monospace', backgroundColor: '#1E2638', color: '#94A3B8' }}>
            COMPLETED
          </span>
        );
      default:
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, fontFamily: 'monospace', backgroundColor: '#1E2638', color: '#94A3B8' }}>
            {status}
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
            CHAMPIONSHIPS • {tournaments.length} TOURNAMENTS
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
            Tournaments
          </h1>
          <p style={{ fontSize: '13px', color: '#8B9BB4', margin: '4px 0 0' }}>
            Configure championship seasons, stages, rules, and match scheduling.
          </p>
        </div>

        <Link
          href={`/${entryPath}/tournaments/new`}
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
          <span>Create Tournament</span>
        </Link>
      </div>

      {/* Grid */}
      {tournaments.length === 0 ? (
        <div
          style={{
            backgroundColor: '#10141E',
            border: '1px dashed #1E2638',
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px' }}>
            No tournaments found
          </h3>
          <p style={{ fontSize: '13px', color: '#8B9BB4', margin: '0 0 20px' }}>
            Create your first tournament to start scheduling fixtures and accepting registrations.
          </p>
          <Link
            href={`/${entryPath}/tournaments/new`}
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
            Create Tournament
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
          {tournaments.map((t: any) => (
            <div
              key={t.id}
              style={{
                backgroundColor: '#10141E',
                border: '1px solid #1E2638',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '18px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}
                  >
                    🏆
                  </div>
                  {getStatusBadge(t.status)}
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>
                  {t.name}
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    backgroundColor: '#141A26',
                    border: '1px solid #1E2638',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <div style={{ color: '#8B9BB4', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Season</div>
                    <div style={{ color: '#FFFFFF', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace' }}>{t.season || '2026'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#8B9BB4', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Format</div>
                    <div style={{ color: '#FFFFFF', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace' }}>{t.format || 'T20'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#8B9BB4', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Stages</div>
                    <div style={{ color: '#FFFFFF', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace' }}>{t.stages?.length ?? 0}</div>
                  </div>
                  <div>
                    <div style={{ color: '#8B9BB4', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Fixtures</div>
                    <div style={{ color: '#FFFFFF', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace' }}>{t._count?.matches ?? 0}</div>
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '14px', borderTop: '1px solid #1E2638', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link
                  href={`/${entryPath}/matches`}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#1E2638',
                    color: '#E2E8F0',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    border: '1px solid #2A364E',
                  }}
                >
                  View Matches
                </Link>
                <Link
                  href={`/${entryPath}/tournaments/${t.id}`}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(192, 39, 45, 0.15)',
                    color: '#F87171',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    border: '1px solid rgba(192, 39, 45, 0.3)',
                  }}
                >
                  Settings
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
