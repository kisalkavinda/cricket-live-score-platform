import { prisma } from 'database';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { getTournamentOverview } from '@/lib/tournament/tournament-service';
import TournamentAdminConsole from './TournamentAdminConsole';

export const dynamic = 'force-dynamic';

export default async function AdminTournamentBracketPage() {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  // Find active tournament
  const tournament = await (prisma as any).tournament.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  const overview = tournament ? await getTournamentOverview(tournament.id) : null;

  // Fetch all official teams in DB
  const allTeams = await (prisma as any).team.findMany({
    select: {
      id: true,
      name: true,
      shortName: true,
      logoUrl: true,
    },
    orderBy: { name: 'asc' },
  });

  // Fetch existing tournamentStage config
  const stages = tournament
    ? await (prisma as any).tournamentStage.findMany({
        where: { tournamentId: tournament.id },
        orderBy: { stageOrder: 'asc' },
      })
    : [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#F1F5F9', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🌿</span> CPL 9-Team Tournament Bracket & Groups
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
            Configure tournament format settings, assign groups, generate 16-match fixtures, and recalculate ball-based NRR.
          </p>
        </div>
      </div>

      <TournamentAdminConsole
        tournament={tournament}
        overview={overview}
        allTeams={allTeams}
        stages={stages}
        entryPath={entryPath}
      />
    </div>
  );
}
