import { prisma } from 'database';
import Link from 'next/link';
import { getAdminEntryPath, requireAdminAuth } from '@/lib/auth/admin-auth';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';

export const dynamic = 'force-dynamic';

const getPlayers = () =>
  prisma.player.findMany({
    orderBy: { name: 'asc' },
    take: 100,
    select: {
      id: true,
      name: true,
      role: true,
      battingStyle: true,
      bowlingStyle: true,
      profileImageUrl: true,
      teamPlayers: {
        select: {
          id: true,
          team: {
            select: {
              id: true,
              name: true,
              shortName: true,
            },
          },
        },
      },
    },
  });

type PlayerRow = Awaited<ReturnType<typeof getPlayers>>[number];
type TeamPlayerRow = PlayerRow['teamPlayers'][number];

export default async function AdminPlayersPage() {
  const tracker = createPerfTracker();
  tracker.authStart = performance.now();
  await requireAdminAuth();
  tracker.authEnd = performance.now();

  const entryPath = getAdminEntryPath();

  tracker.dbStart = performance.now();
  const players = await getPlayers();
  tracker.dbEnd = performance.now();

  tracker.renderStart = performance.now();
  tracker.renderEnd = performance.now();
  logPerfMetric('/players', tracker);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'BATTER':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25">🏏 BATTER</span>;
      case 'BOWLER':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">🎯 BOWLER</span>;
      case 'ALL_ROUNDER':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">⚡ ALL-ROUNDER</span>;
      case 'WICKET_KEEPER':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25">🧤 WICKET-KEEPER</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/10 text-white/70">{role}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold tracking-widest text-[#C0272D] uppercase font-mono">
              Roster
            </span>
            <span className="text-white/30">•</span>
            <span className="text-xs text-white/50">{players.length} Active Profiles</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight font-display text-white">
            Official Players
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Comprehensive player registry with batting/bowling disciplines and franchise squad allocations.
          </p>
        </div>

        <Link
          href={`/${entryPath}/players/new`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C0272D] to-[#991B1F] hover:from-[#D32F35] hover:to-[#B22227] text-white text-sm font-bold shadow-lg shadow-[#C0272D]/25 border border-[#C0272D]/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>+</span>
          <span>Add New Player</span>
        </Link>
      </div>

      {/* Players Table Card */}
      <div className="rounded-2xl bg-[#141010]/80 border border-white/[0.08] backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Player</th>
                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Style</th>
                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider">Team</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-white/50 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm">
              {players.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40">
                    No official players registered yet.
                  </td>
                </tr>
              ) : (
                players.map((player: PlayerRow) => (
                  <tr key={player.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-bold text-xs text-white/80">
                          {player.name.charAt(0)}
                        </div>
                        <div className="font-bold text-white tracking-wide">
                          {player.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(player.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-white/60">
                      <div className="space-y-0.5">
                        {player.battingStyle && <div>🏏 {player.battingStyle}</div>}
                        {player.bowlingStyle && <div>🎯 {player.bowlingStyle}</div>}
                        {!player.battingStyle && !player.bowlingStyle && <span className="text-white/30">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {player.teamPlayers.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {player.teamPlayers.map((tp: TeamPlayerRow) => (
                            <span
                              key={tp.id}
                              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono"
                            >
                              {tp.team.shortName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-white/30 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <Link
                        href={`/${entryPath}/players/${player.id}`}
                        className="font-semibold text-white/60 hover:text-white transition"
                      >
                        Edit →
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
