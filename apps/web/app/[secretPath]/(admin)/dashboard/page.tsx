import Link from 'next/link';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { getDashboardStats } from '@/lib/admin/admin-service';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';

export const dynamic = 'force-dynamic';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Row */}
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
            OVERVIEW • REAL-TIME OPERATIONS
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
            Tournament Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#8B9BB4', margin: '4px 0 0' }}>
            Real-time status of university squad entries, match operations, and cloud sync integrity.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href={`/${entryPath}/matches`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#FBBF24',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              fontFamily: 'monospace',
            }}
          >
            <span>🔴</span>
            <span>Live Scoring Hub</span>
          </Link>

          <Link
            href={`/${entryPath}/registrations`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '8px',
              backgroundColor: '#C0272D',
              border: '1px solid #D32F35',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 10px rgba(192, 39, 45, 0.3)',
            }}
          >
            <span>Review Queue →</span>
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Pending Review */}
        <div
          style={{
            backgroundColor: '#10141E',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              fontWeight: 700,
              color: '#FBBF24',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: 'monospace',
            }}
          >
            <span>Pending Review</span>
            <span>⏳</span>
          </div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '10px 0 4px',
              fontFamily: 'monospace',
            }}
          >
            {stats.registrations.pending}
          </div>
          <div style={{ fontSize: '12px', color: '#8B9BB4' }}>Awaiting administrator approval</div>
        </div>

        {/* Approved Teams */}
        <div
          style={{
            backgroundColor: '#10141E',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              fontWeight: 700,
              color: '#34D399',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: 'monospace',
            }}
          >
            <span>Approved Teams</span>
            <span>🛡️</span>
          </div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '10px 0 4px',
              fontFamily: 'monospace',
            }}
          >
            {stats.registrations.approved}
          </div>
          <div style={{ fontSize: '12px', color: '#8B9BB4' }}>Official tournament franchises</div>
        </div>

        {/* Rejected */}
        <div
          style={{
            backgroundColor: '#10141E',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              fontWeight: 700,
              color: '#F87171',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: 'monospace',
            }}
          >
            <span>Rejected</span>
            <span>✕</span>
          </div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '10px 0 4px',
              fontFamily: 'monospace',
            }}
          >
            {stats.registrations.rejected}
          </div>
          <div style={{ fontSize: '12px', color: '#8B9BB4' }}>Declined team submissions</div>
        </div>

        {/* Total Registrations */}
        <div
          style={{
            backgroundColor: '#10141E',
            border: '1px solid #1E2638',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              fontWeight: 700,
              color: '#8B9BB4',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: 'monospace',
            }}
          >
            <span>Total Entries</span>
            <span>📋</span>
          </div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '10px 0 4px',
              fontFamily: 'monospace',
            }}
          >
            {stats.registrations.total}
          </div>
          <div style={{ fontSize: '12px', color: '#8B9BB4' }}>Lifetime received entries</div>
        </div>
      </div>

      {/* Google Sheets Backup Mirror Health */}
      <div
        style={{
          backgroundColor: '#10141E',
          border: '1px solid #1E2638',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            📊
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
              Google Sheets Backup Mirror
            </div>
            <div style={{ fontSize: '12px', color: '#8B9BB4' }}>
              Secondary offsite spreadsheet synchronization
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', fontFamily: 'monospace' }}>
          <span style={{ color: '#34D399', fontWeight: 700 }}>
            ● {stats.backups.synced} Synced
          </span>
          <span style={{ color: stats.backups.failed > 0 ? '#EF4444' : '#64748B', fontWeight: 700 }}>
            ● {stats.backups.failed} Failed
          </span>
          <span style={{ color: '#FBBF24', fontWeight: 700 }}>
            ● {stats.backups.pending} Pending
          </span>
        </div>
      </div>

      {/* Recent Submissions Table Card */}
      <div
        style={{
          backgroundColor: '#10141E',
          border: '1px solid #1E2638',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
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
              Recent Submissions
            </h3>
            <p style={{ fontSize: '12px', color: '#8B9BB4', margin: '2px 0 0' }}>
              Latest team entries submitted to the portal
            </p>
          </div>
          <Link
            href={`/${entryPath}/registrations`}
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#C0272D',
              textDecoration: 'none',
            }}
          >
            View All ({stats.registrations.total}) →
          </Link>
        </div>

        {stats.recentRegistrations.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8B9BB4', fontSize: '13px' }}>
            No registrations received yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#141A26', borderBottom: '1px solid #1E2638' }}>
                  <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Code</th>
                  <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Team Name</th>
                  <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Leader</th>
                  <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Players</th>
                  <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Backup</th>
                  <th style={{ padding: '12px 18px', color: '#8B9BB4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRegistrations.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #161D2B' }}>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 800, color: '#C0272D' }}>
                      {r.registrationCode}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#FFFFFF' }}>
                      {r.teamName}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#CBD5E1' }}>
                      {r.leaderName}
                    </td>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#8B9BB4' }}>
                      {r.players?.length || 0}
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
                        Review →
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
