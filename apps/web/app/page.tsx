import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import EventDetails from '@/components/EventDetails';
import Registration from '@/components/Registration';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: 'white' }}>
      <Navbar />
      <Hero />
      <EventDetails />
      <Registration />
      <Footer />
    </main>
  );
}
