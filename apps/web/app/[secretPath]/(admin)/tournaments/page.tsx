import { prisma } from 'database';
import Link from 'next/link';
import { getAdminEntryPath, requireAdminAuth } from '@/lib/auth/admin-auth';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';

export const dynamic = 'force-dynamic';

const getTournaments = () =>
  prisma.tournament.findMany({
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

type TournamentRow = Awaited<ReturnType<typeof getTournaments>>[number];

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
          <span className="px-2.5 py-1 text-xs font-extrabold tracking-wider rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE IN PROGRESS
          </span>
        );
      case 'REGISTRATION':
        return (
          <span className="px-2.5 py-1 text-xs font-extrabold tracking-wider rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
            REGISTRATION OPEN
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="px-2.5 py-1 text-xs font-extrabold tracking-wider rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono">
            SCHEDULED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 text-xs font-extrabold tracking-wider rounded-lg bg-white/10 text-white/60 border border-white/10 font-mono">
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-extrabold tracking-wider rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold tracking-widest text-[#C0272D] uppercase font-mono">
              Championships
            </span>
            <span className="text-white/30">•</span>
            <span className="text-xs text-white/50">{tournaments.length} Tournaments</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight font-display text-white">
            Tournaments
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Configure championship seasons, stages, rules, and match scheduling.
          </p>
        </div>

        <Link
          href={`/${entryPath}/tournaments/new`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C0272D] to-[#991B1F] hover:from-[#D32F35] hover:to-[#B22227] text-white text-sm font-bold shadow-lg shadow-[#C0272D]/25 border border-[#C0272D]/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>+</span>
          <span>Create Tournament</span>
        </Link>
      </div>

      {/* Grid of Tournaments */}
      {tournaments.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.02] border border-dashed border-white/10 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl mx-auto mb-3">
            🏆
          </div>
          <h3 className="text-base font-bold text-white mb-1">No tournaments found</h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto mb-5">
            Create your first tournament to start scheduling fixtures and accepting team registrations.
          </p>
          <Link
            href={`/${entryPath}/tournaments/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
          >
            Create Tournament
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament: TournamentRow) => (
            <div
              key={tournament.id}
              className="group relative rounded-2xl bg-[#141010]/80 hover:bg-[#1A1414]/90 border border-white/[0.08] hover:border-white/20 p-6 backdrop-blur-xl transition-all duration-200 hover:shadow-xl hover:shadow-black/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
                    🏆
                  </div>
                  {getStatusBadge(tournament.status)}
                </div>

                <h3 className="text-xl font-extrabold text-white group-hover:text-amber-400 transition-colors mb-2 font-display tracking-wide">
                  {tournament.name}
                </h3>

                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs mb-6">
                  <div>
                    <div className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Season</div>
                    <div className="font-bold text-white font-mono mt-0.5">{tournament.season || '2026'}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Format</div>
                    <div className="font-bold text-white font-mono mt-0.5">{tournament.format || 'T20'}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Stages</div>
                    <div className="font-bold text-white font-mono mt-0.5">{tournament.stages.length}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Fixtures</div>
                    <div className="font-bold text-white font-mono mt-0.5">{tournament._count?.matches ?? 0}</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center gap-2.5">
                <Link
                  href={`/${entryPath}/matches`}
                  className="flex-1 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-bold text-center border border-white/10 transition"
                >
                  View Matches
                </Link>
                <Link
                  href={`/${entryPath}/tournaments/${tournament.id}`}
                  className="flex-1 py-2 rounded-lg bg-[#C0272D]/20 hover:bg-[#C0272D]/30 text-red-300 text-xs font-bold text-center border border-[#C0272D]/30 transition"
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
