import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import LiveScoreWidget from '@/components/LiveScoreWidget';
import HomePointsTable from '@/components/HomePointsTable';
import TournamentBracket from '@/components/TournamentBracket';
import EventDetails from '@/components/EventDetails';
import Registration from '@/components/Registration';
import RegistrationSkeleton from '@/components/RegistrationSkeleton';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--color-paper-alt)' }}>
      <Navbar />
      <Hero />
      <LiveScoreWidget />
      <HomePointsTable />
      <TournamentBracket />
      <EventDetails />
      {/*
        Suspense boundary: Navbar, Hero, LiveScoreWidget, EventDetails render
        immediately. Registration streams in when the cached DB team-count
        resolves (≤60s cache, graceful fallback = 0).
        LiveScoreWidget is NOT wrapped — it uses static mock data and is
        already a client component. No caching is applied to it.
      */}
      <Suspense fallback={<RegistrationSkeleton />}>
        <Registration />
      </Suspense>
      <Footer />
    </main>
  );
}

