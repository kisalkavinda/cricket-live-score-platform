import { prisma } from 'database';
import Link from 'next/link';

const getTournaments = () => prisma.tournament.findMany({ include: { stages: true } });
type TournamentRow = Awaited<ReturnType<typeof getTournaments>>[number];

export const dynamic = 'force-dynamic';

export default async function AdminTournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      stages: true
    }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tournaments</h1>
        <Link href="/admin/tournaments/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow">
          + Create Tournament
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
            No tournaments found. Create your first one.
          </div>
        ) : (
          tournaments.map((tournament: TournamentRow) => (
            <div key={tournament.id} className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{tournament.name}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    tournament.status === 'LIVE' ? 'bg-emerald-100 text-emerald-700' :
                    tournament.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {tournament.status}
                  </span>
                </div>
                
                <div className="text-sm text-slate-500 mb-6">
                  <p>Season: {tournament.season}</p>
                  <p>Format: {tournament.format}</p>
                  <p>Stages: {tournament.stages.length}</p>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors text-sm font-medium">
                    Manage Stages
                  </button>
                  <button className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors text-sm font-medium">
                    Settings
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
