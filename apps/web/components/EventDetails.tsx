import { tournamentConfig } from '../config/tournament';

const cards = [
  {
    title: 'Date',
    icon: '📅',
    value: tournamentConfig.date,
  },
  {
    title: 'Time',
    icon: '⏰',
    value: tournamentConfig.time,
  },
  {
    title: 'Venue',
    icon: '📍',
    value: tournamentConfig.venue ? (
      tournamentConfig.venueMapUrl ? (
        <a 
          href={tournamentConfig.venueMapUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[var(--color-primary-red)] hover:text-[var(--color-accent-gold)] underline underline-offset-4 transition-all"
        >
          {tournamentConfig.venue}
        </a>
      ) : (
        <span>{tournamentConfig.venue}</span>
      )
    ) : (
      <span className="text-[var(--color-foreground)]/60 italic">Venue — coming soon</span>
    ),
  },
  {
    title: 'Format',
    icon: '🏏',
    value: tournamentConfig.maxTeams === null 
      ? "Registration open — format announced once teams are confirmed" 
      : tournamentConfig.format,
  },
  {
    title: 'Entry Fee',
    icon: '💰',
    value: tournamentConfig.entryFee,
  },
  {
    title: 'Registration Deadline',
    icon: '⏳',
    value: tournamentConfig.registrationDeadline,
  },
];

export default function EventDetails() {
  return (
    <section id="details" className="py-24 bg-[var(--color-background)] relative">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
      
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-[var(--color-foreground)] mb-4 tracking-tight uppercase">Event Details</h2>
          <div className="h-2 w-24 bg-[var(--color-primary-red)] mx-auto skew-x-[-10deg]"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <div 
              key={idx} 
              className="group relative p-1 bg-[var(--color-foreground)] hover:bg-[var(--color-primary-red)] transition-colors duration-300 ease-in-out shadow-[4px_4px_0px_var(--color-foreground)] hover:translate-y-1 hover:shadow-[2px_2px_0px_var(--color-foreground)]"
            >
              <div className="h-full bg-[var(--color-background)] p-8 flex flex-col items-start gap-4">
                <div className="text-4xl bg-[var(--color-foreground)]/5 p-4 group-hover:scale-110 transition-transform duration-300">
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-foreground)]/60 uppercase tracking-wider mb-2">
                    {card.title}
                  </h3>
                  <div className="text-lg text-[var(--color-foreground)] font-bold">
                    {card.value}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
