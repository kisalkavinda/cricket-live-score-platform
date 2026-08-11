import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import LiveScoreWidget from '@/components/LiveScoreWidget';
import EventDetails from '@/components/EventDetails';
import Registration from '@/components/Registration';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--color-paper-alt)' }}>
      <Navbar />
      <Hero />
      <LiveScoreWidget />
      <EventDetails />
      <Registration />
      <Footer />
    </main>
  );
}
