import { prisma } from 'database';
import Link from 'next/link';
import { getAdminEntryPath, requireAdminAuth } from '@/lib/auth/admin-auth';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';

export const dynamic = 'force-dynamic';

const getTeams = () =>
  prisma.team.findMany({
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
          matchesWon: true,
        },
      },
    },
  });

type TeamRow = Awaited<ReturnType<typeof getTeams>>[number];

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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold tracking-widest text-[#C0272D] uppercase font-mono">
              Directory
            </span>
            <span className="text-white/30">•</span>
            <span className="text-xs text-white/50">{teams.length} Registered</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight font-display text-white">
            Official Teams
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Manage participating tournament franchises, rosters, and official team logos.
          </p>
        </div>

        <Link
          href={`/${entryPath}/teams/new`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C0272D] to-[#991B1F] hover:from-[#D32F35] hover:to-[#B22227] text-white text-sm font-bold shadow-lg shadow-[#C0272D]/25 border border-[#C0272D]/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>+</span>
          <span>Add New Team</span>
        </Link>
      </div>

      {/* Grid of Teams */}
      {teams.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.02] border border-dashed border-white/10 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl mx-auto mb-3">
            🛡️
          </div>
          <h3 className="text-base font-bold text-white mb-1">No official teams yet</h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto mb-5">
            Teams will appear here once approved from registrations or created manually.
          </p>
          <Link
            href={`/${entryPath}/teams/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
          >
            Create Team Franchise
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team: TeamRow) => (
            <div
              key={team.id}
              className="group relative rounded-2xl bg-[#141010]/80 hover:bg-[#1A1414]/90 border border-white/[0.08] hover:border-white/20 p-5 backdrop-blur-xl transition-all duration-200 hover:shadow-xl hover:shadow-black/50"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3.5">
                  {team.logoUrl ? (
                    <img
                      src={team.logoUrl}
                      alt={team.name}
                      className="w-12 h-12 rounded-xl object-cover bg-black/40 border border-white/10 p-1"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-extrabold text-base tracking-wider font-mono">
                      {team.shortName}
                    </div>
                  )}

                  <div>
                    <h3 className="font-extrabold text-base text-white group-hover:text-amber-400 transition-colors">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white/10 text-white/80 border border-white/10">
                        {team.shortName}
                      </span>
                      {team.city && (
                        <span className="text-xs text-white/50 flex items-center gap-1">
                          📍 {team.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-white/60">
                  <span>
                    <strong className="text-white font-mono">{team._count?.teamPlayers ?? 0}</strong> Players
                  </span>
                  <span>
                    <strong className="text-emerald-400 font-mono">{team._count?.matchesWon ?? 0}</strong> Wins
                  </span>
                </div>

                <Link
                  href={`/${entryPath}/teams/${team.id}`}
                  className="text-xs font-semibold text-white/50 hover:text-white transition"
                >
                  Manage →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
