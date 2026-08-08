import Link from 'next/link';
import { tournamentConfig } from '../config/tournament';

export default function Registration() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Decorative background lines */}
      <div className="absolute inset-0 opacity-10">
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
        <div className="bg-slate-900/50 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          {/* Status Badge */}
          <div className="absolute top-0 right-0 m-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {tournamentConfig.teamsRegistered === null 
                ? "Registration Open" 
                : `${tournamentConfig.teamsRegistered} Teams Registered`}
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 pr-40">Ready to Play?</h2>
          
          <div className="prose prose-invert prose-lg text-slate-300 mb-10">
            <p>
              Gather your squad and register before the deadline. Make sure you have the following details ready before starting the application:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6">
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                <span>Team Name & Optional Logo</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                <span>Captain's Contact Info</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                <span>Full Squad List (Min 11 players)</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                <span>Entry Fee Proof of Payment</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-950/50 rounded-2xl border border-slate-800">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold mb-1">Deadline</p>
              <p className="text-xl text-white font-medium">{tournamentConfig.registrationDeadline}</p>
            </div>
            
            <Link 
              href={tournamentConfig.registrationFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-lg rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center whitespace-nowrap"
            >
              Complete Registration
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
