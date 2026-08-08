import { prisma } from 'database';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminPlayersPage() {
  const players = await prisma.player.findMany({
    orderBy: { name: 'asc' },
    include: {
      teamPlayers: {
        include: { team: true }
      }
    }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Players</h1>
        <Link href="/admin/players/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow">
          + Add New Player
        </Link>
      </div>
      
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Style</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Team</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {players.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No players found.
                </td>
              </tr>
            ) : (
              players.map((player) => (
                <tr key={player.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{player.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">{player.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                    {player.battingStyle && <div>🏏 {player.battingStyle}</div>}
                    {player.bowlingStyle && <div>🎯 {player.bowlingStyle}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                    {player.teamPlayers.length > 0 
                      ? player.teamPlayers.map(tp => tp.team.shortName).join(', ')
                      : <span className="text-slate-400 italic">Unassigned</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
