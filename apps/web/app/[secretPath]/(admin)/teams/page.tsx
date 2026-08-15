import { prisma } from 'database';
import Link from 'next/link';

import { getAdminEntryPath, requireAdminAuth } from '@/lib/auth/admin-auth';

const getTeams = () => prisma.team.findMany({
  orderBy: { createdAt: 'desc' },
  select: {
    id: true,
    name: true,
    shortName: true,
    logoUrl: true,
    city: true,
  },
});

type TeamRow = Awaited<ReturnType<typeof getTeams>>[number];

export const dynamic = 'force-dynamic'; // Prevent static caching for admin pages

export default async function AdminTeamsPage() {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const teams = await getTeams();



  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Teams</h1>
        <Link href={`/${entryPath}/teams/new`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow">
          + Add New Team
        </Link>
      </div>
      
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Logo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Short Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">City</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {teams.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No teams found. Please add one.
                </td>
              </tr>
            ) : (
              teams.map((team: TeamRow) => (
                <tr key={team.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {team.logoUrl ? (
                      <img src={team.logoUrl} alt={team.name} className="h-10 w-10 rounded-full object-cover border" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                        {team.shortName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{team.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">{team.shortName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">{team.city || '-'}</td>
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
