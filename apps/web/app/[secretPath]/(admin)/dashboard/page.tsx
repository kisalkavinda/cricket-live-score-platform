import Link from 'next/link';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { getDashboardStats } from '@/lib/admin/admin-service';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';

export default async function AdminDashboardPage() {
  const tracker = createPerfTracker();
  tracker.authStart = performance.now();
  await requireAdminAuth();
  tracker.authEnd = performance.now();

  const entryPath = getAdminEntryPath();

  tracker.dbStart = performance.now();
  const stats = await getDashboardStats();
  tracker.dbEnd = performance.now();

  tracker.renderStart = performance.now();
  tracker.renderEnd = performance.now();
  logPerfMetric('/dashboard', tracker);


  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C0272D', textTransform: 'uppercase' }}>
            Overview Console
          </span>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', margin: '4px 0 0', color: '#FFFFFF' }}>
            Tournament Dashboard
          </h1>
        </div>
        <Link
          href={`/${entryPath}/registrations`}
          style={{
            background: '#C0272D',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Review Registrations →
        </Link>
      </div>

      {/* Primary Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {/* Pending Card */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1.5px solid rgba(234, 179, 8, 0.3)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#EAB308', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Pending Review
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF', margin: '8px 0 4px', fontFamily: 'var(--font-display)' }}>
            {stats.registrations.pending}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.5)' }}>Awaiting manual approval</div>
        </div>

        {/* Approved Card */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1.5px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Approved Teams
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF', margin: '8px 0 4px', fontFamily: 'var(--font-display)' }}>
            {stats.registrations.approved}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.5)' }}>Official teams confirmed</div>
        </div>

        {/* Rejected Card */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1.5px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Rejected
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF', margin: '8px 0 4px', fontFamily: 'var(--font-display)' }}>
            {stats.registrations.rejected}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.5)' }}>Declined submissions</div>
        </div>

        {/* Total Card */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1.5px solid rgba(255, 255, 255, 0.12)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total Registrations
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF', margin: '8px 0 4px', fontFamily: 'var(--font-display)' }}>
            {stats.registrations.total}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.5)' }}>Submitted to date</div>
        </div>
      </div>

      {/* Backup Status Strip */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>📊</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Google Sheets Backup Integrity</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Secondary online mirror status</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.82rem', color: '#22C55E' }}>
            ● <strong>{stats.backups.synced}</strong> Synced
          </span>
          <span style={{ fontSize: '0.82rem', color: stats.backups.failed > 0 ? '#EF4444' : 'rgba(255, 255, 255, 0.5)' }}>
            ● <strong>{stats.backups.failed}</strong> Failed
          </span>
          <span style={{ fontSize: '0.82rem', color: '#EAB308' }}>
            ● <strong>{stats.backups.pending}</strong> Pending
          </span>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Recent Submissions</h3>
          <Link href={`/${entryPath}/registrations`} style={{ color: '#C0272D', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none' }}>
            View All ({stats.registrations.total}) →
          </Link>
        </div>

        {stats.recentRegistrations.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem' }}>
            No registrations received yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left', color: 'rgba(255, 255, 255, 0.6)' }}>
                  <th style={{ padding: '10px 12px' }}>Code</th>
                  <th style={{ padding: '10px 12px' }}>Team Name</th>
                  <th style={{ padding: '10px 12px' }}>Leader</th>
                  <th style={{ padding: '10px 12px' }}>Players</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Backup</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRegistrations.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#C0272D' }}>
                      {r.registrationCode}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{r.teamName}</td>
                    <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>{r.leaderName}</td>
                    <td style={{ padding: '12px' }}>{r.players?.length || 0}</td>
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
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <Link
                        href={`/${entryPath}/registrations/${r.id}`}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#FFFFFF',
                          padding: '5px 12px',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
