import Link from 'next/link';
import SeamArc from './SeamArc';
import { tournamentConfig } from '../config/tournament';

export default function Hero() {
  const regOpen = !!tournamentConfig.registrationFormUrl;

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
      style={{ background: 'var(--stadium-black)' }}
      aria-label="CPL Tournament Hero"
    >
      {/*
        ── SEAM ARC — bottom-left anchor ──────────────────────────────────
        Rendered at 30% on Stadium Black. The SVG is 480×288px by default.
        We position it bottom-left, partially clipped by overflow:hidden.
      */}
      <div className="absolute bottom-0 left-0 pointer-events-none select-none" aria-hidden="true">
        <SeamArc surface="dark" size={560} />
      </div>

      {/*
        ── EMBER RED hard vertical accent bar ─────────────────────────────
        A 4px column on the far left — the first thing the eye meets.
        This is the "broadcast lower-third" feel from the design plan.
      */}
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{ background: 'var(--ember-red)' }}
        aria-hidden="true"
      />

      {/*
        ── GOLD horizontal rule at the very top ───────────────────────────
        Trophy-moment gold, used nowhere else except awards — one subtle use
        here marks this as a high-status section.
      */}
      <div
        className="absolute top-0 left-0 w-full h-px"
        style={{ background: 'var(--boundary-gold)', opacity: 0.6 }}
        aria-hidden="true"
      />

      {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
      <div className="relative z-10 px-6 sm:px-10 md:px-16 max-w-screen-xl mx-auto w-full pt-24 pb-32">

        {/* Status pill */}
        <div className="mb-8">
          <span
            className="inline-flex items-center gap-2 px-3 py-1"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: regOpen ? 'var(--strip-white)' : 'var(--crease-ash)',
              background: regOpen ? 'var(--ember-red)' : 'transparent',
              border: regOpen ? 'none' : '1px solid rgba(240,237,234,0.3)',
            }}
          >
            {regOpen && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--strip-white)' }}
              />
            )}
            {regOpen ? 'Registrations Open' : 'Registrations Opening Soon'}
          </span>
        </div>

        {/* Tournament name — Barlow Condensed Black, enormous */}
        <div className="mb-6">
          <h1
            className="text-display"
            style={{
              fontSize: 'clamp(5rem, 18vw, 14rem)',
              color: 'var(--crease-ash)',
              lineHeight: 0.88,
            }}
          >
            {tournamentConfig.name}
          </h1>
        </div>

        {/* Tagline — left-bordered, Inter */}
        <p
          className="mb-12 max-w-xl"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(0.95rem, 2vw, 1.125rem)',
            fontWeight: 500,
            color: 'rgba(240,237,234,0.7)',
            borderLeft: '3px solid var(--ember-red)',
            paddingLeft: '1rem',
            lineHeight: 1.55,
          }}
        >
          {tournamentConfig.tagline}
        </p>

        {/* Date block — scoreboard treatment */}
        {tournamentConfig.date && (
          <div className="mb-12">
            <p className="text-label" style={{ color: 'rgba(240,237,234,0.45)', marginBottom: '0.25rem' }}>
              Date
            </p>
            <p
              className="text-scoreboard"
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                color: 'var(--boundary-gold)',
              }}
            >
              {tournamentConfig.date}
            </p>
          </div>
        )}

        {/* CTA row */}
        <div className="flex flex-wrap gap-4 items-center">
          {regOpen ? (
            <Link
              href={tournamentConfig.registrationFormUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Register your team
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ) : (
            <button
              disabled
              className="btn-primary"
              aria-label="Registration is not yet open"
            >
              Registration opening soon
            </button>
          )}

          <a href="#details" className="btn-ghost">
            View details
          </a>
        </div>
      </div>

      {/* ── HARD BOTTOM EDGE — no waves, no curves ─────────────────────── */}
      <div
        className="absolute bottom-0 left-0 w-full"
        style={{
          height: '4px',
          background: `linear-gradient(90deg, var(--ember-red) 0%, var(--boundary-gold) 40%, var(--ember-red) 100%)`,
        }}
        aria-hidden="true"
      />

      {/* ── SCROLL INDICATOR ───────────────────────────────────────────── */}
      <div
        className="absolute bottom-8 right-8 flex flex-col items-center gap-1.5 motion-safe:animate-bounce"
        aria-hidden="true"
      >
        <span className="text-label" style={{ color: 'rgba(240,237,234,0.35)', fontSize: '0.625rem' }}>
          Scroll
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ember-red)" strokeWidth="2.5">
          <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}
