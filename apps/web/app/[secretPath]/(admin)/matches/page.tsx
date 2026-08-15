import Link from 'next/link';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { getMatchesList } from '@/lib/scoring/scoring-service';
import { createPerfTracker, logPerfMetric } from '@/lib/utils/perf-logger';

export const dynamic = 'force-dynamic';

export default async function AdminMatchesPage() {
  const tracker = createPerfTracker();
  tracker.authStart = performance.now();
  await requireAdminAuth();
  tracker.authEnd = performance.now();

  const entryPath = getAdminEntryPath();

  tracker.dbStart = performance.now();
  const matches = await getMatchesList();
  tracker.dbEnd = performance.now();

  tracker.renderStart = performance.now();
  tracker.renderEnd = performance.now();
  logPerfMetric('/matches', tracker);

  const liveMatches = matches.filter((m: any) => m.status === 'LIVE');
  const upcomingMatches = matches.filter((m: any) => m.status === 'UPCOMING');
  const completedMatches = matches.filter((m: any) => m.status === 'COMPLETED' || m.status === 'ABANDONED');

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold tracking-widest text-amber-400 uppercase font-mono">
              Live Operations
            </span>
            <span className="text-white/30">•</span>
            <span className="text-xs text-white/50">{matches.length} Total Fixtures</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight font-display text-white">
            Matches & Live Scoring
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Schedule championship fixtures, control live ball-by-ball scoring, and broadcast real-time updates.
          </p>
        </div>

        <Link
          href={`/${entryPath}/matches/new`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C0272D] to-[#991B1F] hover:from-[#D32F35] hover:to-[#B22227] text-white text-sm font-bold shadow-lg shadow-[#C0272D]/25 border border-[#C0272D]/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>+</span>
          <span>Create New Match</span>
        </Link>
      </div>

      {/* 🔴 LIVE IN-PROGRESS MATCHES */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-md shadow-red-500" />
          <h2 className="text-lg font-black tracking-wide font-display text-amber-400 uppercase">
            Live Matches ({liveMatches.length})
          </h2>
        </div>

        {liveMatches.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.02] border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
            No matches currently live. Start an upcoming fixture below to launch the live scoring engine.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {liveMatches.map((m: any) => {
              const currentInn = m.innings?.find((i: any) => i.inningsNumber === m.currentInnings) || m.innings?.[0];
              return (
                <div
                  key={m.id}
                  className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-[#161111] to-[#120E0E] border border-amber-500/35 p-6 backdrop-blur-xl shadow-xl shadow-amber-500/5 space-y-5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-1 rounded-md bg-red-500 text-white font-extrabold font-mono tracking-wider flex items-center gap-1.5 animate-pulse">
                      ● LIVE INNINGS {m.currentInnings}
                    </span>
                    <span className="text-white/60 flex items-center gap-1">
                      📍 {m.venue || 'Main University Ground'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-2">
                    <div className="flex-1">
                      <div className="text-lg font-black text-white">{m.teamA.name}</div>
                      <div className="text-xs text-white/50 font-mono">{m.teamA.shortName}</div>
                    </div>
                    <div className="text-sm font-black text-amber-400 font-mono px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                      VS
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-lg font-black text-white">{m.teamB.name}</div>
                      <div className="text-xs text-white/50 font-mono">{m.teamB.shortName}</div>
                    </div>
                  </div>

                  {currentInn && (
                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] flex items-center justify-between">
                      <div className="text-xs text-white/80">
                        Batting: <strong className="text-white font-semibold">{currentInn.battingTeam?.name}</strong>
                      </div>
                      <div className="text-xl font-black text-amber-400 font-mono">
                        {currentInn.runs}/{currentInn.wickets}{' '}
                        <span className="text-xs text-white/50 font-medium font-sans">
                          ({currentInn.overs}.{currentInn.balls} ov)
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <Link
                      href={`/${entryPath}/matches/${m.id}/score`}
                      className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs text-center tracking-wider transition shadow-lg shadow-amber-400/20"
                    >
                      ⚡ OPEN SCORING CONSOLE
                    </Link>
                    <Link
                      href={`/scorecard?matchId=${m.id}`}
                      target="_blank"
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition"
                    >
                      Public View ↗
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📅 UPCOMING FIXTURES */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">📅</span>
          <h2 className="text-lg font-black tracking-wide font-display text-white uppercase">
            Upcoming Fixtures ({upcomingMatches.length})
          </h2>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8 text-center text-sm text-white/40">
            No upcoming fixtures scheduled.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcomingMatches.map((m: any) => (
              <div
                key={m.id}
                className="rounded-2xl bg-[#141010]/80 border border-white/[0.08] hover:border-white/20 p-5 backdrop-blur-xl transition space-y-4"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 font-mono font-bold">
                    {m.oversPerInnings} Overs
                  </span>
                  <span className="text-white/50 text-[11px]">
                    📍 {m.venue || 'Main Ground'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-bold text-white text-base">{m.teamA.name}</div>
                    <div className="text-xs text-white/50 font-mono">{m.teamA.shortName}</div>
                  </div>
                  <span className="text-xs font-bold text-white/30 font-mono">VS</span>
                  <div className="text-right">
                    <div className="font-bold text-white text-base">{m.teamB.name}</div>
                    <div className="text-xs text-white/50 font-mono">{m.teamB.shortName}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs text-white/40 font-mono">
                    {m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : 'TBD'}
                  </span>
                  <Link
                    href={`/${entryPath}/matches/${m.id}/score`}
                    className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                  >
                    Start Match →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🏆 COMPLETED FIXTURES */}
      {completedMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🏆</span>
            <h2 className="text-lg font-black tracking-wide font-display text-white/80 uppercase">
              Completed Matches ({completedMatches.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedMatches.map((m: any) => (
              <div
                key={m.id}
                className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{m.tournament?.name || 'Tournament'}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                    FINISHED
                  </span>
                </div>

                <div className="font-bold text-white">
                  {m.teamA.name} vs {m.teamB.name}
                </div>

                {m.resultNote && (
                  <div className="text-xs text-amber-300/80 font-medium">
                    {m.resultNote}
                  </div>
                )}

                <div className="pt-2 border-t border-white/[0.04] text-right">
                  <Link
                    href={`/scorecard?matchId=${m.id}`}
                    target="_blank"
                    className="text-xs text-white/60 hover:text-white transition"
                  >
                    View Scorecard ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
