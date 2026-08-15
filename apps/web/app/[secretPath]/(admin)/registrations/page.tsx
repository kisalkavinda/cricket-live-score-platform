import Link from 'next/link';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { getRegistrationsList } from '@/lib/admin/admin-service';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';

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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold tracking-widest text-[#C0272D] uppercase font-mono">
              Verification Queue
            </span>
            <span className="text-white/30">•</span>
            <span className="text-xs text-white/50">{totalCount} Submissions</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight font-display text-white">
            Team Registrations
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Verify submitted university rosters, validate index numbers, and approve official teams.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl bg-[#141010]/80 border border-white/[0.08] p-5 backdrop-blur-xl shadow-lg">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="flex-1 min-w-[260px]">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search code, team name, leader, or index number..."
              className="w-full h-11 px-4 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#C0272D] transition"
            />
          </div>

          {/* Status Filter */}
          <div className="w-44">
            <select
              name="status"
              defaultValue={status}
              className="w-full h-11 px-3 rounded-xl bg-[#1A1414] border border-white/15 text-white text-sm focus:outline-none focus:border-[#C0272D] transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Backup Status Filter */}
          <div className="w-44">
            <select
              name="backupStatus"
              defaultValue={backupStatus}
              className="w-full h-11 px-3 rounded-xl bg-[#1A1414] border border-white/15 text-white text-sm focus:outline-none focus:border-[#C0272D] transition"
            >
              <option value="ALL">All Backup States</option>
              <option value="SYNCED">Synced (Mirror)</option>
              <option value="PENDING">Pending Sync</option>
              <option value="FAILED">Failed Sync</option>
            </select>
          </div>

          <button
            type="submit"
            className="h-11 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition flex items-center gap-2"
          >
            <span>🔍</span>
            <span>Filter</span>
          </button>
        </form>
      </div>

      {/* Registrations List Card */}
      <div className="rounded-2xl bg-[#141010]/80 border border-white/[0.08] backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider font-mono">Code</th>
                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Team</th>
                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Leader / Index</th>
                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Squad</th>
                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Backup</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-white/50 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm">
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                    No registrations match the selected criteria.
                  </td>
                </tr>
              ) : (
                registrations.map((r: any) => (
                  <tr key={r.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-[#C0272D]">
                      {r.registrationCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-white">
                      {r.teamName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white/90 font-medium">{r.leaderName}</div>
                      <div className="text-xs text-white/40 font-mono">{r.leaderIndexNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-white/70">
                      {r._count?.players ?? r.players?.length ?? 0} players
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono ${
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
                        className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition inline-block"
                      >
                        Review & Verify →
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
