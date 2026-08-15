'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { tournamentConfig } from '../config/tournament';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const navLinks = [
    { label: '🔴 Live Scores', href: '/#live-scores', id: 'nav-scores' },
    { label: 'Overview', href: '/', id: 'nav-overview' },
    { label: 'Tournament Info', href: '/#details', id: 'nav-details' },
    { label: 'Register Squad', href: '/register', id: 'nav-register' },
  ];

  return (
    <header
      style={{
        position: 'fixed',
        top: '16px',
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
        pointerEvents: 'none',
      }}
    >
      {/* Hallmark Floating Pill Container (Desktop & Mobile) */}
      <div
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: '960px',
          height: '52px',
          borderRadius: '9999px',
          background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 12, 12, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: scrolled
            ? '1.5px solid var(--color-border)'
            : '1.5px solid rgba(255, 255, 255, 0.15)',
          boxShadow: scrolled
            ? '0 8px 30px rgba(0, 0, 0, 0.08)'
            : '0 12px 40px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px 0 20px',
          transition: 'all var(--dur-base) var(--ease-out)',
          position: 'relative',
        }}
      >
        {/* Brand Logo & Tag */}
        <Link
          href="/"
          id="nav-brand"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent-ink)',
              fontWeight: 900,
              fontSize: '0.8rem',
              fontFamily: 'var(--font-display)',
            }}
          >
            🏏
          </div>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '1.4rem',
              letterSpacing: '0.04em',
              color: scrolled ? 'var(--color-ink)' : 'var(--color-paper)',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
            }}
          >
            {tournamentConfig.shortName || 'CPL'}
          </span>
        </Link>

        {/* Desktop Inline Nav Links - STRICTLY DESKTOP ONLY */}
        <nav
          style={{
            alignItems: 'center',
            gap: '4px',
          }}
          aria-label="Main Navigation"
          className="hidden md:flex md-flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.id}
              id={link.id}
              href={link.href}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: scrolled ? 'var(--color-ink)' : 'rgba(255, 255, 255, 0.85)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'background var(--dur-fast), color var(--dur-fast)',
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.background = scrolled
                  ? 'var(--color-paper-alt)'
                  : 'rgba(255, 255, 255, 0.12)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.background = 'transparent';
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Button & Mobile Hamburger Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href="/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '30px',
              padding: '0 14px',
              background: 'var(--color-accent)',
              color: 'var(--color-accent-ink)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.8rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              borderRadius: '9999px',
              boxShadow: '0 2px 10px rgba(192, 39, 45, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all var(--dur-fast) var(--ease-out)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-accent-hover)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-accent)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            Register
          </Link>

          {/* Mobile Menu Button - STRICTLY HIDDEN ON DESKTOP */}
          <button
            type="button"
            className="md:hidden md-hide"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close Menu' : 'Open Menu'}
            style={{
              background: mobileOpen ? 'rgba(192, 39, 45, 0.15)' : 'transparent',
              border: mobileOpen ? '1px solid var(--color-accent)' : 'none',
              borderRadius: '8px',
              color: scrolled ? 'var(--color-ink)' : 'var(--color-paper)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Sheet - STRICTLY HIDDEN ON DESKTOP (md:hidden md-hide) */}
      {mobileOpen && (
        <div
          className="md:hidden md-hide"
          style={{
            position: 'absolute',
            top: '74px',
            left: '16px',
            right: '16px',
            maxWidth: '480px',
            margin: '0 auto',
            pointerEvents: 'auto',
            background: 'var(--color-paper-dark)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)',
            zIndex: 101,
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={`mobile-${link.id}`}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-paper)',
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 800,
                fontSize: '1rem',
                textDecoration: 'none',
                background: link.id === 'nav-scores' ? 'rgba(192, 39, 45, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: link.id === 'nav-scores' ? '1px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.06)',
                transition: 'all var(--dur-fast)',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
