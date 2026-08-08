import Link from 'next/link';
import { tournamentConfig } from '../config/tournament';
import { prisma } from 'database';

export default async function Registration() {
  let registeredTeamsCount = 0;
  try {
    registeredTeamsCount = await prisma.team.count();
  } catch (error) {
    console.error("Failed to fetch team count:", error);
  }

  return (
    <section className="py-24 bg-[var(--color-foreground)] relative overflow-hidden">
      {/* Decorative background lines */}
      <div className="absolute inset-0 opacity-20 text-[var(--color-background)]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 40V0H40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="bg-[var(--color-background)] border-4 border-[var(--color-foreground)] p-8 md:p-12 shadow-[10px_10px_0px_var(--color-primary-red)] relative overflow-hidden">
          <div className="absolute top-0 right-0 m-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-foreground)] text-[var(--color-background)] text-sm font-bold uppercase border-2 border-[var(--color-foreground)] shadow-[4px_4px_0px_var(--color-primary-red)]">
              {tournamentConfig.registrationFormUrl && (
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary-red)] animate-pulse"></span>
              )}
              {registeredTeamsCount} Teams Registered
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-extrabold text-[var(--color-foreground)] mb-6 pr-40 uppercase">Ready to Play?</h2>
          
          <div className="prose prose-lg text-[var(--color-foreground)]/80 mb-10 font-medium">
            <p>
              Gather your squad and register before the deadline. Make sure you have the following details ready before starting the application:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6">
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[var(--color-primary-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                <span>Team Name & Optional Logo</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[var(--color-primary-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                <span>Captain's Contact Info</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[var(--color-primary-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                <span>Full Squad List (Min 11 players)</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[var(--color-primary-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                <span>Entry Fee Proof of Payment</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-[var(--color-background)] border-4 border-[var(--color-foreground)] relative">
            <div className="absolute inset-0 bg-[var(--color-primary-red)]/5 pointer-events-none"></div>
            <div className="flex-1 text-center sm:text-left relative z-10">
              <p className="text-sm text-[var(--color-foreground)]/60 uppercase tracking-widest font-bold mb-1">Deadline</p>
              <p className="text-xl text-[var(--color-foreground)] font-extrabold">{tournamentConfig.registrationDeadline || "TBA"}</p>
            </div>
            
            {tournamentConfig.registrationFormUrl ? (
              <Link 
                href={tournamentConfig.registrationFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-10 w-full sm:w-auto px-8 py-4 bg-[var(--color-primary-red)] hover:translate-y-1 text-white font-bold text-lg uppercase transition-all duration-300 shadow-[4px_4px_0px_var(--color-foreground)] hover:shadow-[2px_2px_0px_var(--color-foreground)] flex items-center justify-center whitespace-nowrap"
              >
                Complete Registration
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            ) : (
              <button 
                disabled
                className="relative z-10 w-full sm:w-auto px-8 py-4 bg-[var(--color-foreground)]/10 text-[var(--color-foreground)]/50 font-bold text-lg uppercase border-2 border-[var(--color-foreground)]/10 cursor-not-allowed flex items-center justify-center whitespace-nowrap"
              >
                Registrations Not Open
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
