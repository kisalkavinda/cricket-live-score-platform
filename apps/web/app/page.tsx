import Hero from '@/components/Hero';
import EventDetails from '@/components/EventDetails';
import Registration from '@/components/Registration';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950">
      <Hero />
      <EventDetails />
      <Registration />
    </main>
  );
}
