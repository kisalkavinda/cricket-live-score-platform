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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold tracking-widest text-[#C0272D] uppercase font-mono">
              Command Overview
            </span>
            <span className="text-white/30">•</span>
            <span className="text-xs text-white/50">Real-time Operations</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight font-display text-white">
            Tournament Dashboard
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Real-time status of university squad entries, match operations, and cloud sync integrity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${entryPath}/matches`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono transition"
          >
            <span>🔴</span>
            <span>Live Scoring Hub</span>
          </Link>
          <Link
            href={`/${entryPath}/registrations`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C0272D] to-[#991B1F] hover:from-[#D32F35] hover:to-[#B22227] text-white text-sm font-bold shadow-lg shadow-[#C0272D]/25 border border-[#C0272D]/40 transition"
          >
            <span>Review Queue →</span>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-[#141010] to-[#120E0E] border border-amber-500/30 p-5 backdrop-blur-xl shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
            <span>Pending Review</span>
            <span className="text-base">⏳</span>
          </div>
          <div className="text-4xl font-black text-white my-3 font-display tracking-tight">
            {stats.registrations.pending}
          </div>
          <div className="text-xs text-amber-200/60 font-medium">Awaiting administrator approval</div>
        </div>

        {/* Approved Card */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-[#141010] to-[#120E0E] border border-emerald-500/30 p-5 backdrop-blur-xl shadow-lg shadow-emerald-500/5">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
            <span>Approved Teams</span>
            <span className="text-base">🛡️</span>
          </div>
          <div className="text-4xl font-black text-white my-3 font-display tracking-tight">
            {stats.registrations.approved}
          </div>
          <div className="text-xs text-emerald-200/60 font-medium">Official tournament franchises</div>
        </div>

        {/* Rejected Card */}
        <div className="rounded-2xl bg-gradient-to-br from-red-500/10 via-[#141010] to-[#120E0E] border border-red-500/30 p-5 backdrop-blur-xl shadow-lg shadow-red-500/5">
          <div className="flex items-center justify-between text-xs font-bold text-red-400 uppercase tracking-wider font-mono">
            <span>Rejected</span>
            <span className="text-base">✕</span>
          </div>
          <div className="text-4xl font-black text-white my-3 font-display tracking-tight">
            {stats.registrations.rejected}
          </div>
          <div className="text-xs text-red-200/60 font-medium">Declined team entries</div>
        </div>

        {/* Total Card */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 via-[#141010] to-[#120E0E] border border-white/15 p-5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between text-xs font-bold text-white/70 uppercase tracking-wider font-mono">
            <span>Total Entries</span>
            <span className="text-base">📋</span>
          </div>
          <div className="text-4xl font-black text-white my-3 font-display tracking-tight">
            {stats.registrations.total}
          </div>
          <div className="text-xs text-white/50 font-medium">Lifetime received submissions</div>
        </div>
      </div>

      {/* Google Sheets Backup Health Bar */}
      <div className="rounded-2xl bg-[#141010]/80 border border-white/[0.08] p-5 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl">
            📊
          </div>
          <div>
            <div className="font-extrabold text-sm text-white">Google Sheets Backup Mirror</div>
            <div className="text-xs text-white/50">Secondary offsite spreadsheet synchronization</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <strong>{stats.backups.synced}</strong> Synced
          </span>
          <span className={`flex items-center gap-1.5 ${stats.backups.failed > 0 ? 'text-red-400' : 'text-white/40'}`}>
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <strong>{stats.backups.failed}</strong> Failed
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <strong>{stats.backups.pending}</strong> Pending
          </span>
        </div>
      </div>

      {/* Recent Submissions Card */}
      <div className="rounded-2xl bg-[#141010]/80 border border-white/[0.08] backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black tracking-wide font-display text-white">
              Recent Submissions
            </h3>
            <p className="text-xs text-white/50 mt-0.5">Latest registrations received by the portal</p>
          </div>
          <Link
            href={`/${entryPath}/registrations`}
            className="text-xs font-bold text-[#C0272D] hover:text-red-400 transition"
          >
            View All ({stats.registrations.total}) →
          </Link>
        </div>

        {stats.recentRegistrations.length === 0 ? (
          <div className="p-12 text-center text-white/40 text-sm">
            No registrations received yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider font-mono">Code</th>
                  <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Team Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Leader</th>
                  <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Players</th>
                  <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Backup</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-white/50 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm">
                {stats.recentRegistrations.map((r: any) => (
                  <tr key={r.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-[#C0272D]">
                      {r.registrationCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-white">
                      {r.teamName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-white/80">
                      {r.leaderName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-white/70">
                      {r.players?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : r.status === 'REJECTED'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-bold font-mono ${
                          r.backupStatus === 'SYNCED'
                            ? 'text-emerald-400'
                            : r.backupStatus === 'FAILED'
                            ? 'text-red-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {r.backupStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <Link
                        href={`/${entryPath}/registrations/${r.id}`}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition inline-block"
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
