import { prisma } from 'database';
import { getDrawState } from '@/lib/tournament/draw-service';
import DrawCeremonyClient from '@/app/tournament/draw/DrawCeremonyClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Official Group Draw Ceremony | CPL 2026',
  description: 'Live interactive digital sealed-chit group draw ceremony for Computing Premier League 2026.',
};

export default async function PublicTournamentDrawPage() {
  try {
    // Find active tournament
    const tournament = await (prisma as any).tournament.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const drawState = tournament ? await getDrawState(tournament.id) : null;

    return (
      <div style={{ minHeight: '100vh', background: '#0A0D14', color: '#F1F5F9' }}>
        <DrawCeremonyClient
          tournamentId={tournament?.id || ''}
          tournamentName={tournament?.name || 'CPL Tournament'}
          tournamentSeason={tournament?.season || '2026'}
          initialDraw={drawState}
        />
      </div>
    );
  } catch (err: any) {
    console.error('ERROR IN PublicTournamentDrawPage:', err);
    return (
      <div style={{ padding: '40px', color: '#EF4444', background: '#10141E' }}>
        <h2>Draw Page Error</h2>
        <pre>{err?.stack || err?.message || String(err)}</pre>
      </div>
    );
  }
}
