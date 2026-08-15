import Link from 'next/link';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { getRegistrationsList } from '@/lib/admin/admin-service';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';
import DeleteRegistrationButton from '@/components/admin/DeleteRegistrationButton';

export const dynamic = 'force-dynamic';

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const tracker = createPerfTracker();
  tracker.authStart = performance.now();
  await requireAdminAuth();
  tracker.authEnd = performance.now();

  const entryPath = getAdminEntryPath();
  const resolvedParams = await searchParams;

  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : 'ALL';
  const backupStatus = typeof resolvedParams.backupStatus === 'string' ? resolvedParams.backupStatus : 'ALL';
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';
  const page = parseInt(typeof resolvedParams.page === 'string' ? resolvedParams.page : '1', 10) || 1;

  tracker.dbStart = performance.now();
  const data = await getRegistrationsList({ status, backupStatus, search, page, limit: 15 });
  tracker.dbEnd = performance.now();

  tracker.renderStart = performance.now();
  tracker.renderEnd = performance.now();
  logPerfMetric('/registrations', tracker);

  const totalCount = data?.pagination?.total ?? 0;
  const registrations = data?.items ?? [];

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
            VERIFICATION QUEUE • {totalCount} SUBMISSIONS
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
            Team Registrations
          </h1>
          <p style={{ fontSize: '13px', color: '#8B9BB4', margin: '4px 0 0' }}>
            Verify submitted university rosters, validate student index numbers, and approve official teams.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#10141E',
          border: '1px solid #1E2638',
          borderRadius: '12px',
          padding: '16px 20px',
        }}
      >
        <form method="GET" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search code, team name, leader, or index number..."
              style={{
                width: '100%',
                height: '40px',
                padding: '0 14px',
                borderRadius: '8px',
                backgroundColor: '#1A1F2C',
                border: '1px solid #2A364E',
                color: '#FFFFFF',
                fontSize: '13px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              name="status"
              defaultValue={status}
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
                outline: 'none',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              name="backupStatus"
              defaultValue={backupStatus}
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
                outline: 'none',
              }}
            >
              <option value="ALL">All Backup States</option>
              <option value="SYNCED">Synced (Mirror)</option>
              <option value="PENDING">Pending Sync</option>
              <option value="FAILED">Failed Sync</option>
            </select>
          </div>

          <button
            type="submit"
            style={{
              height: '40px',
              padding: '0 20px',
              borderRadius: '8px',
              backgroundColor: '#1E2638',
              border: '1px solid #2A364E',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Filter
          </button>
        </form>
      </div>

      {/* Registrations Data Table */}
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
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Code</th>
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Team Name</th>
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Leader / Index</th>
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Squad</th>
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Backup</th>
                <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: '#8B9BB4' }}>
                    No registrations match the selected filters.
                  </td>
                </tr>
              ) : (
                registrations.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #161D2B' }}>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 800, color: '#C0272D' }}>
                      {r.registrationCode}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#FFFFFF' }}>
                      {r.teamName}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{r.leaderName}</div>
                      <div style={{ color: '#8B9BB4', fontSize: '11px', fontFamily: 'monospace', marginTop: '2px' }}>{r.leaderIndexNumber}</div>
                    </td>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#8B9BB4' }}>
                      {r._count?.players ?? r.players?.length ?? 0} players
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          backgroundColor:
                            r.status === 'APPROVED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : r.status === 'REJECTED'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                          color:
                            r.status === 'APPROVED'
                              ? '#34D399'
                              : r.status === 'REJECTED'
                              ? '#F87171'
                              : '#FBBF24',
                          border:
                            r.status === 'APPROVED'
                              ? '1px solid rgba(16, 185, 129, 0.3)'
                              : r.status === 'REJECTED'
                              ? '1px solid rgba(239, 68, 68, 0.3)'
                              : '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>
                      <span
                        style={{
                          color: r.backupStatus === 'SYNCED' ? '#34D399' : r.backupStatus === 'FAILED' ? '#F87171' : '#FBBF24',
                        }}
                      >
                        {r.backupStatus}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Link
                          href={`/${entryPath}/registrations/${r.id}`}
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
                          Review & Verify →
                        </Link>
                        <DeleteRegistrationButton
                          isIconOnly
                          registrationId={r.id}
                          registrationCode={r.registrationCode}
                          teamName={r.teamName}
                        />
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
