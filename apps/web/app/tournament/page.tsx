import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getTournamentOverview } from '@/lib/tournament/tournament-service';
import TournamentHubClient from './TournamentHubClient';

export const revalidate = 0; // Always fresh tournament data

export const metadata: Metadata = {
  title: 'Tournament Hub · Computing Premier League',
  description: 'Official Computing Premier League tournament dashboard. Live match status, championship bracket, 8-team group standings, playoffs, and softball Net Run Rate.',
};

export default async function TournamentPage() {
  let overview = null;
  try {
    overview = await getTournamentOverview();
  } catch (err: any) {
    console.error('[TournamentPage] getTournamentOverview error:', err);
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background: '#0B0B0F',
        color: '#F1F5F9',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <Navbar />

      {/* Main Interactive Client Component */}
      <div style={{ paddingTop: '80px' }}>
        <TournamentHubClient initialOverview={overview} />
      </div>

      <Footer />
    </main>
  );
}

