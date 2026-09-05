import { prisma } from 'database';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import { getDrawState, getEligibleTournamentTeams } from '@/lib/tournament/draw-service';
import GroupDrawAdminConsole from './GroupDrawAdminConsole';

export const dynamic = 'force-dynamic';

export default async function AdminTournamentDrawPage() {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  // Find active tournament
  const tournament = await (prisma as any).tournament.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!tournament) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px', background: '#10141E', borderRadius: '12px', border: '1px solid #1E2638', textAlign: 'center', color: '#94A3B8' }}>
        <h2 style={{ color: '#F1F5F9', marginBottom: '8px' }}>No Active Tournament</h2>
        <p>Please create or activate a tournament before conducting the group draw ceremony.</p>
      </div>
    );
  }

  // Fetch current draw state (sanitized)
  const drawState = await getDrawState(tournament.id);

  // Fetch eligibility details (teams, registrations)
  const eligibility = await getEligibleTournamentTeams(tournament.id);

  // Fetch all official teams in the DB for potential fallback assignment if teams < 9
  const allDbTeams = await (prisma as any).team.findMany({
    select: { id: true, name: true, shortName: true, logoUrl: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#C0272D', textTransform: 'uppercase', marginBottom: '4px' }}>
            OFFICIAL CEREMONY
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#F1F5F9',
              margin: '0 0 6px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span>🎲</span> CPL Digital Group Draw Ceremony
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
            Host and orchestrate the digital sealed-chit group draw for 9 registered teams across Group A, Group B, and Group C.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a
            href="/tournament/draw"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#38BDF8',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span>📺</span> Projector / Live Ceremony View ↗
          </a>
        </div>
      </div>

      <GroupDrawAdminConsole
        tournament={tournament}
        initialDraw={drawState}
        eligibility={eligibility}
        allDbTeams={allDbTeams}
        entryPath={entryPath}
      />
    </div>
  );
}
