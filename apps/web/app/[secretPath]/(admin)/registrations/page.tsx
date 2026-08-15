import Link from 'next/link';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { getRegistrationsList } from '@/lib/admin/admin-service';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';

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


  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C0272D', textTransform: 'uppercase' }}>
            Verification Queue
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', margin: '4px 0 0', color: '#FFFFFF' }}>
            Team Registrations
          </h1>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
        }}
      >
        <form method="GET" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 260px' }}>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search code, team, leader, or index number..."
              style={{
                width: '100%',
                height: '40px',
                padding: '0 14px',
                borderRadius: '6px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '140px' }}>
            <select
              name="status"
              defaultValue={status}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 10px',
                borderRadius: '6px',
                background: '#1A1616',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Backup Filter */}
          <div style={{ minWidth: '140px' }}>
            <select
              name="backupStatus"
              defaultValue={backupStatus}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 10px',
                borderRadius: '6px',
                background: '#1A1616',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              <option value="ALL">All Backups</option>
              <option value="SYNCED">Synced</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending Backup</option>
            </select>
          </div>

          <button
            type="submit"
            style={{
              height: '40px',
              padding: '0 18px',
              borderRadius: '6px',
              background: '#C0272D',
              border: 'none',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Filter
          </button>
        </form>
      </div>

      {/* Registrations List Table */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        }}
      >
        {data.items.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
            No registrations matching your criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left', color: 'rgba(255, 255, 255, 0.6)' }}>
                  <th style={{ padding: '10px 12px' }}>Code</th>
                  <th style={{ padding: '10px 12px' }}>Team Name</th>
                  <th style={{ padding: '10px 12px' }}>Leader</th>
                  <th style={{ padding: '10px 12px' }}>Leader Index</th>
                  <th style={{ padding: '10px 12px' }}>Squad</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Backup</th>
                  <th style={{ padding: '10px 12px' }}>Submitted</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#C0272D' }}>
                      {r.registrationCode}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#FFFFFF' }}>{r.teamName}</td>
                    <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.85)' }}>{r.leaderName}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.7)' }}>
                      {r.leaderIndexNumber}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        {r.players.length}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background:
                            r.status === 'APPROVED'
                              ? 'rgba(34, 197, 94, 0.15)'
                              : r.status === 'REJECTED'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(234, 179, 8, 0.15)',
                          color:
                            r.status === 'APPROVED'
                              ? '#22C55E'
                              : r.status === 'REJECTED'
                              ? '#EF4444'
                              : '#EAB308',
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: r.backupStatus === 'SYNCED' ? '#22C55E' : r.backupStatus === 'FAILED' ? '#EF4444' : '#EAB308',
                        }}
                      >
                        {r.backupStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <Link
                        href={`/${entryPath}/registrations/${r.id}`}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#FFFFFF',
                          padding: '6px 14px',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        Review Squad
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', marginRight: '8px' }}>
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
            </span>
            {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/${entryPath}/registrations?status=${status}&backupStatus=${backupStatus}&search=${search}&page=${p}`}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: p === data.pagination.page ? '#C0272D' : 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
