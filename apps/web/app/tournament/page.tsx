import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getTournamentOverview } from '@/lib/tournament/tournament-service';
import TournamentHubClient from './TournamentHubClient';

export const revalidate = 0; // Always fresh tournament data

export const metadata = {
  title: 'CPL 2026 Tournament Hub | Championship Bracket, Standings & NRR',
  description: 'Official Computing Premier League tournament dashboard. Live match status, championship bracket, group standings, wildcard race, and softball Net Run Rate.',
};

export default async function TournamentPage() {
  const overview = await getTournamentOverview();

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

