import Link from 'next/link';
import { tournamentConfig } from '../config/tournament';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 text-white">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950/80 to-slate-950 z-0" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl mix-blend-screen animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto">
        <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-medium tracking-wide text-sm backdrop-blur-sm">
          🏆 Registrations Now Open
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-300 leading-tight">
          {tournamentConfig.name}
        </h1>
        
        <p className="text-lg md:text-2xl text-slate-300 mb-10 max-w-2xl font-light">
          {tournamentConfig.tagline}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            href={tournamentConfig.registrationFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-300 ease-in-out bg-blue-600 rounded-xl hover:bg-blue-500 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
          >
            <span>Register Your Team</span>
            <svg className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          
          <a 
            href="#details"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium transition-all duration-300 ease-in-out border border-slate-700 bg-slate-800/50 backdrop-blur-md rounded-xl hover:bg-slate-800 hover:border-slate-600 text-slate-300 hover:text-white"
          >
            View Details
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-70 animate-bounce">
        <span className="text-xs text-slate-400 mb-2 uppercase tracking-widest">Scroll to explore</span>
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
