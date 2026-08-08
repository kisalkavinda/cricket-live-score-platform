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
    value: (
      <a 
        href={tournamentConfig.venueMapUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-500/30 hover:decoration-blue-400 transition-all"
      >
        {tournamentConfig.venue}
      </a>
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
    <section id="details" className="py-24 bg-slate-900 relative">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
      
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">Event Details</h2>
          <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <div 
              key={idx} 
              className="group relative p-1 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 hover:from-blue-600/50 hover:to-emerald-600/50 transition-all duration-500 ease-in-out"
            >
              <div className="h-full bg-slate-900/90 backdrop-blur-xl p-8 rounded-xl border border-slate-800/50 flex flex-col items-start gap-4">
                <div className="text-4xl bg-slate-800/50 p-4 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {card.title}
                  </h3>
                  <div className="text-lg text-slate-100 font-medium">
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
